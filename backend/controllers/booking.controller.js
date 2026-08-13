const { query } = require("../config/db");
const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/error.middleware");
const bookingService = require("../services/booking.service");
const {
  notifyBookingConfirmation,
  notifyBookingStatusChange,
  notifyBookingStatusUpdate,
} = require("../services/bookingNotification.service");
const {
  canGuestCancelBooking,
  canGuestModifyStayBooking,
  GUEST_SELF_SERVICE_STATUSES,
} = require("../utils/bookingConstants");
const {
  normalizePhoneForMatch,
  parseDate,
  parseInteger,
  parseUuid,
  trimOrNull,
  validateGuestFields,
  validateStayDates,
  nightsBetween,
} = require("../validators/booking.validator");
const {
  normalizeNotificationPreferences,
  parseNotificationPreferences,
} = require("../utils/notificationPreferences");

const MAX_ADULTS = 30;
const MAX_CHILDREN = 30;
const MAX_ROOMS = 20;

// Guest-facing projection. Internal identifiers, the owning admin and audit
// columns are deliberately excluded.
const PUBLIC_BOOKING_FIELDS = `
  b.booking_number, b.guest_name,
  -- Rendered as plain calendar dates: a DATE serialised through JSON as a
  -- timestamp shifts a day for clients east/west of UTC.
  to_char(b.check_in_date, 'YYYY-MM-DD') AS check_in_date,
  to_char(b.check_out_date, 'YYYY-MM-DD') AS check_out_date,
  b.adults, b.children, b.number_of_rooms,
  b.booking_status, b.payment_status, b.special_requests,
  b.cancellation_reason,
  b.notification_preferences,
  b.subtotal, b.tax_amount, b.total_amount, b.currency,
  b.created_at, b.confirmed_at, b.cancelled_at,
  h.slug AS hotel_slug, h.name AS hotel_name, h.city AS hotel_city,
  h.check_in_time, h.check_out_time,
  rt.slug AS room_type_slug, rt.name AS room_type_name,
  r.room_number
`;

function asIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function fetchPublicBooking(bookingNumber) {
  const result = await query(
    `SELECT ${PUBLIC_BOOKING_FIELDS},
            b.guest_email, b.guest_phone
     FROM bookings b
     INNER JOIN hotels h ON h.id = b.hotel_id
     INNER JOIN room_types rt ON rt.id = b.room_type_id
     LEFT JOIN rooms r ON r.id = b.room_id
     WHERE UPPER(b.booking_number) = UPPER($1)
     LIMIT 1`,
    [bookingNumber]
  );
  return result.rows[0] || null;
}

/** Internal fetch for guest modify — includes ids needed by applyBookingStayUpdate. */
async function fetchBookingForGuestModify(bookingNumber) {
  const result = await query(
    `SELECT ${PUBLIC_BOOKING_FIELDS},
            b.id, b.hotel_id, b.room_type_id, b.room_id,
            b.guest_email, b.guest_phone,
            rt.base_price AS room_type_base_price,
            rt.status AS room_type_status,
            h.currency_code,
            h.status AS hotel_status
     FROM bookings b
     INNER JOIN hotels h ON h.id = b.hotel_id
     INNER JOIN room_types rt ON rt.id = b.room_type_id
     LEFT JOIN rooms r ON r.id = b.room_id
     WHERE UPPER(b.booking_number) = UPPER($1)
     LIMIT 1`,
    [bookingNumber]
  );
  return result.rows[0] || null;
}

function guestModifyNotFoundError() {
  return new AppError(
    "No booking found matching that reference and contact detail",
    404
  );
}

/**
 * Shared contact + stay parsing for guest modify / preview.
 * Returns { booking, proposed, amounts, dirty } or sends validation and returns null.
 */
async function resolveGuestStayModification(req, res, { requireStayChange }) {
  const bookingNumber = trimOrNull(req.params.bookingNumber);
  const body = req.body || {};
  const email = trimOrNull(body.email);
  const phone = trimOrNull(body.phone);

  if (!email && !phone) {
    sendValidationError(res, [
      "Provide the email or phone used for the booking to modify it",
    ]);
    return null;
  }

  const notFound = guestModifyNotFoundError();
  if (!bookingNumber) throw notFound;

  const booking = await fetchBookingForGuestModify(bookingNumber);
  if (!booking) throw notFound;
  if (!verifyPublicBookingContact(booking, email, phone)) throw notFound;

  if (!canGuestModifyStayBooking(booking.booking_status)) {
    throw new AppError(
      booking.booking_status === "cancelled"
        ? "Booking is already cancelled"
        : `Stay details cannot be changed online while the booking is ${String(
            booking.booking_status
          ).replace(/_/g, " ")}`,
      400
    );
  }

  const errors = [];
  const currentIn = asIsoDate(booking.check_in_date);
  const currentOut = asIsoDate(booking.check_out_date);

  let checkIn = currentIn;
  let checkOut = currentOut;
  let roomTypeId = booking.room_type_id;
  let numberOfRooms = Number(booking.number_of_rooms) || 1;

  const touched = {
    check_in_date: body.check_in_date !== undefined,
    check_out_date: body.check_out_date !== undefined,
    room_type_id: body.room_type_id !== undefined,
    number_of_rooms: body.number_of_rooms !== undefined,
  };

  if (
    !touched.check_in_date &&
    !touched.check_out_date &&
    !touched.room_type_id &&
    !touched.number_of_rooms
  ) {
    sendValidationError(res, [
      "Provide at least one of check_in_date, check_out_date, room_type_id, or number_of_rooms",
    ]);
    return null;
  }

  if (touched.check_in_date) {
    const value = parseDate(body.check_in_date, "check_in_date", errors);
    if (value) checkIn = value;
  }
  if (touched.check_out_date) {
    const value = parseDate(body.check_out_date, "check_out_date", errors);
    if (value) checkOut = value;
  }
  if (touched.check_in_date || touched.check_out_date) {
    validateStayDates(checkIn, checkOut, errors, { allowPastDates: false });
  } else {
    validateStayDates(checkIn, checkOut, errors, { allowPastDates: false });
  }

  if (touched.room_type_id) {
    const value = parseUuid(body.room_type_id, "room_type_id", errors);
    if (value) roomTypeId = value;
  }

  if (touched.number_of_rooms) {
    const value = parseInteger(
      body.number_of_rooms,
      "number_of_rooms",
      errors,
      { min: 1, max: MAX_ROOMS, fallback: undefined }
    );
    if (value !== undefined) numberOfRooms = value;
  }

  if (errors.length > 0) {
    sendValidationError(res, errors);
    return null;
  }

  const dirty =
    checkIn !== currentIn ||
    checkOut !== currentOut ||
    roomTypeId !== booking.room_type_id ||
    numberOfRooms !== Number(booking.number_of_rooms);

  if (requireStayChange && !dirty) {
    return {
      booking,
      proposed: {
        checkIn,
        checkOut,
        roomTypeId,
        numberOfRooms,
      },
      dirty: false,
      amounts: null,
      availability: null,
      roomType: null,
    };
  }

  const roomTypeResult = await query(
    `SELECT id, hotel_id, status, base_price, name, slug
     FROM room_types
     WHERE id = $1
     LIMIT 1`,
    [roomTypeId]
  );
  if (roomTypeResult.rows.length === 0) {
    throw new AppError(`Room type not found: ${roomTypeId}`, 404);
  }
  const roomType = roomTypeResult.rows[0];
  if (roomType.hotel_id !== booking.hotel_id) {
    throw new AppError("room_type_id does not belong to the booking's hotel", 400);
  }
  if (roomType.status !== "active") {
    throw new AppError("This room type is not open for online booking", 409);
  }

  const nights = nightsBetween(checkIn, checkOut);
  const amounts = bookingService.buildIndicativeAmounts(
    roomType.base_price,
    nights,
    numberOfRooms
  );

  const availability = await bookingService.checkAvailability({
    hotelId: booking.hotel_id,
    roomTypeId,
    checkIn,
    checkOut,
    excludeBookingId: booking.id,
  });

  return {
    booking,
    proposed: { checkIn, checkOut, roomTypeId, numberOfRooms },
    dirty,
    amounts,
    availability,
    roomType,
  };
}

/**
 * Indicative pricing from the room type's configured base price. Guest-supplied
 * amounts are never trusted; staff can adjust the reservation afterwards. A base
 * price of 0 means "on request" and leaves the totals at zero.
 */
function buildIndicativeAmounts(basePrice, nights, rooms) {
  const price = Number(basePrice);
  if (!Number.isFinite(price) || price <= 0) {
    return {
      nightly_rate: null,
      on_request: true,
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
    };
  }
  const subtotal = Math.round(price * nights * rooms * 100) / 100;
  return {
    nightly_rate: price,
    on_request: false,
    subtotal,
    tax_amount: 0,
    total_amount: subtotal,
  };
}

/**
 * Public availability probe for the guest booking UI. Resolves a hotel by id or
 * slug, then returns each active room type with live inventory counts and the
 * same indicative amounts createBooking would record (tax_amount is always 0
 * until a payment/tax engine exists).
 */
const getAvailability = asyncHandler(async (req, res) => {
  const q = req.query || {};
  const errors = [];

  const hotelIdRaw = trimOrNull(q.hotel_id);
  const hotelSlug = trimOrNull(q.hotel_slug);
  const roomTypeIdFilter = parseUuid(q.room_type_id, "room_type_id", errors, {
    required: false,
  });

  if (!hotelIdRaw && !hotelSlug) {
    errors.push("Provide hotel_id or hotel_slug");
  }

  let hotelId = null;
  if (hotelIdRaw) {
    hotelId = parseUuid(hotelIdRaw, "hotel_id", errors);
  }

  const checkIn = parseDate(q.check_in_date, "check_in_date", errors);
  const checkOut = parseDate(q.check_out_date, "check_out_date", errors);
  validateStayDates(checkIn, checkOut, errors, { allowPastDates: false });

  const numberOfRooms = parseInteger(
    q.number_of_rooms,
    "number_of_rooms",
    errors,
    { min: 1, max: MAX_ROOMS, fallback: 1 }
  );

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  let hotelResult;
  if (hotelId) {
    hotelResult = await query(
      `SELECT id, slug, name, status, currency_code
       FROM hotels
       WHERE id = $1
       LIMIT 1`,
      [hotelId]
    );
  } else {
    hotelResult = await query(
      `SELECT id, slug, name, status, currency_code
       FROM hotels
       WHERE slug = $1
       LIMIT 1`,
      [hotelSlug]
    );
  }

  if (hotelResult.rows.length === 0) {
    throw new AppError("Hotel not found", 404);
  }

  const hotel = hotelResult.rows[0];
  if (hotel.status !== "active") {
    throw new AppError("Hotel is not available for booking", 404);
  }

  const roomTypeParams = [hotel.id];
  let roomTypeSql = `
    SELECT id, slug, name, status, base_price, max_occupancy, bed_type
    FROM room_types
    WHERE hotel_id = $1 AND status = 'active'`;
  if (roomTypeIdFilter) {
    roomTypeParams.push(roomTypeIdFilter);
    roomTypeSql += ` AND id = $2`;
  }
  roomTypeSql += ` ORDER BY sort_order ASC, name ASC`;

  const roomTypesResult = await query(roomTypeSql, roomTypeParams);
  const nights = nightsBetween(checkIn, checkOut);

  const roomTypes = [];
  for (const roomType of roomTypesResult.rows) {
    const availability = await bookingService.checkAvailability({
      hotelId: hotel.id,
      roomTypeId: roomType.id,
      checkIn,
      checkOut,
    });
    const amounts = buildIndicativeAmounts(
      roomType.base_price,
      nights,
      numberOfRooms
    );
    const availableEnough = availability.available_rooms >= numberOfRooms;

    roomTypes.push({
      room_type_id: roomType.id,
      slug: roomType.slug,
      name: roomType.name,
      max_occupancy: roomType.max_occupancy,
      bed_type: roomType.bed_type,
      base_price: Number(roomType.base_price),
      total_rooms: availability.total_rooms,
      booked_rooms: availability.booked_rooms,
      available_rooms: availability.available_rooms,
      is_available: availableEnough && !availability.stop_sell,
      nightly_rate: amounts.nightly_rate,
      on_request: amounts.on_request,
      subtotal: amounts.subtotal,
      tax_amount: amounts.tax_amount,
      total_amount: amounts.total_amount,
    });
  }

  return sendSuccess(res, 200, {
    data: {
      hotel_id: hotel.id,
      hotel_slug: hotel.slug,
      hotel_name: hotel.name,
      currency: hotel.currency_code || "INR",
      check_in_date: checkIn,
      check_out_date: checkOut,
      nights,
      number_of_rooms: numberOfRooms,
      room_types: roomTypes,
    },
  });
});

const createBooking = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const errors = [];

  const hotelId = parseUuid(body.hotel_id, "hotel_id", errors);
  const roomTypeId = parseUuid(body.room_type_id, "room_type_id", errors);
  const guest = validateGuestFields(body, errors);

  const checkIn = parseDate(body.check_in_date, "check_in_date", errors);
  const checkOut = parseDate(body.check_out_date, "check_out_date", errors);
  validateStayDates(checkIn, checkOut, errors, { allowPastDates: false });

  const adults = parseInteger(body.adults, "adults", errors, {
    min: 1,
    max: MAX_ADULTS,
    fallback: 1,
  });
  const children = parseInteger(body.children, "children", errors, {
    min: 0,
    max: MAX_CHILDREN,
    fallback: 0,
  });
  const numberOfRooms = parseInteger(
    body.number_of_rooms,
    "number_of_rooms",
    errors,
    { min: 1, max: MAX_ROOMS, fallback: 1 }
  );

  const specialRequests = trimOrNull(body.special_requests);
  if (specialRequests && specialRequests.length > 2000) {
    errors.push("special_requests must be at most 2000 characters");
  }

  // Private staff notes must never be accepted on the public create path.
  if (body.admin_notes !== undefined) {
    errors.push("admin_notes is not accepted on public booking create");
  }

  const prefsParse = parseNotificationPreferences(body.notification_preferences);
  if (!prefsParse.ok) {
    errors.push(...prefsParse.errors);
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const roomTypeResult = await query(
    `SELECT base_price, max_occupancy FROM room_types WHERE id = $1 LIMIT 1`,
    [roomTypeId]
  );
  const nights = nightsBetween(checkIn, checkOut);
  const amounts = buildIndicativeAmounts(
    roomTypeResult.rows[0]?.base_price,
    nights,
    numberOfRooms
  );

  const { bookingId } = await bookingService.createBooking({
    hotel_id: hotelId,
    room_type_id: roomTypeId,
    room_id: null,
    guest_name: guest.guest_name,
    guest_email: guest.guest_email,
    guest_phone: guest.guest_phone,
    check_in_date: checkIn,
    check_out_date: checkOut,
    adults,
    children,
    number_of_rooms: numberOfRooms,
    booking_source: "website",
    booking_status: "pending",
    payment_status: "unpaid",
    special_requests: specialRequests,
    notification_preferences: prefsParse.value,
    subtotal: amounts.subtotal,
    tax_amount: amounts.tax_amount,
    total_amount: amounts.total_amount,
    currency: null,
    created_by_admin_id: null,
    require_active_hotel: true,
    require_active_room_type: true,
  });

  const created = await query(
    `SELECT ${PUBLIC_BOOKING_FIELDS}
     FROM bookings b
     INNER JOIN hotels h ON h.id = b.hotel_id
     INNER JOIN room_types rt ON rt.id = b.room_type_id
     LEFT JOIN rooms r ON r.id = b.room_id
     WHERE b.id = $1
     LIMIT 1`,
    [bookingId]
  );

  const publicBooking = created.rows[0];
  // Guest contact is omitted from the API response; attach it only for email.
  notifyBookingConfirmation({
    ...publicBooking,
    guest_email: guest.guest_email,
    guest_name: guest.guest_name,
  });

  return sendSuccess(res, 201, {
    message:
      "Booking request received. Our team will confirm your reservation shortly.",
    data: toPublicBookingPayload(publicBooking),
  });
});

/**
 * Guest self-service lookup. The caller must prove ownership with the email or
 * phone on the reservation. A wrong booking number and a failed verification
 * return the identical 404 so the endpoint cannot be used to discover which
 * booking references exist.
 */
function verifyPublicBookingContact(booking, email, phone) {
  const emailMatches =
    Boolean(email) &&
    booking.guest_email.toLowerCase() === email.toLowerCase();
  const phoneMatches =
    Boolean(phone) &&
    normalizePhoneForMatch(booking.guest_phone) ===
      normalizePhoneForMatch(phone);
  return emailMatches || phoneMatches;
}

function toPublicBookingPayload(booking) {
  const {
    guest_email: _email,
    guest_phone: _phone,
    id: _id,
    hotel_id: _hotelId,
    room_type_id: _roomTypeId,
    room_id: _roomId,
    room_type_base_price: _basePrice,
    room_type_status: _rtStatus,
    currency_code: _currencyCode,
    hotel_status: _hotelStatus,
    admin_notes: _adminNotes,
    created_by_admin_id: _createdBy,
    notification_preferences: rawPrefs,
    ...safe
  } = booking;
  return {
    ...safe,
    notification_preferences: normalizeNotificationPreferences(rawPrefs),
    nights: nightsBetween(booking.check_in_date, booking.check_out_date),
  };
}

const getBookingByNumber = asyncHandler(async (req, res) => {
  const bookingNumber = trimOrNull(req.params.bookingNumber);
  const email = trimOrNull(req.query.email);
  const phone = trimOrNull(req.query.phone);

  if (!email && !phone) {
    return sendValidationError(res, [
      "Provide the email or phone used for the booking to view it",
    ]);
  }

  const notFound = new AppError(
    "No booking found matching that reference and contact detail",
    404
  );

  if (!bookingNumber) throw notFound;

  const booking = await fetchPublicBooking(bookingNumber);
  if (!booking) throw notFound;

  if (!verifyPublicBookingContact(booking, email, phone)) throw notFound;

  return sendSuccess(res, 200, {
    data: toPublicBookingPayload(booking),
  });
});

/**
 * Guest self-service cancel. Contact verification matches lookup (same 404 on
 * failure). Eligible statuses: pending | confirmed. Uses existing cancelled
 * fields only — no schema change. admin_notes is never returned.
 */
const cancelBookingByNumber = asyncHandler(async (req, res) => {
  const bookingNumber = trimOrNull(req.params.bookingNumber);
  const body = req.body || {};
  const email = trimOrNull(body.email);
  const phone = trimOrNull(body.phone);

  if (!email && !phone) {
    return sendValidationError(res, [
      "Provide the email or phone used for the booking to cancel it",
    ]);
  }

  const notFound = new AppError(
    "No booking found matching that reference and contact detail",
    404
  );

  if (!bookingNumber) throw notFound;

  const booking = await fetchPublicBooking(bookingNumber);
  if (!booking) throw notFound;
  if (!verifyPublicBookingContact(booking, email, phone)) throw notFound;

  if (!canGuestCancelBooking(booking.booking_status)) {
    throw new AppError(
      booking.booking_status === "cancelled"
        ? "Booking is already cancelled"
        : `This booking cannot be cancelled online while it is ${booking.booking_status.replace(/_/g, " ")}`,
      400
    );
  }

  const errors = [];
  let cancellationReason;
  if (body.cancellation_reason !== undefined) {
    cancellationReason = trimOrNull(body.cancellation_reason);
    if (cancellationReason && cancellationReason.length > 2000) {
      errors.push("cancellation_reason must be at most 2000 characters");
    }
  }
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const sets = [
    "booking_status = 'cancelled'",
    "cancelled_at = COALESCE(cancelled_at, NOW())",
  ];
  const params = [];
  if (body.cancellation_reason !== undefined) {
    params.push(cancellationReason);
    sets.push(`cancellation_reason = $${params.length}`);
  }

  // Scope update by booking_number + current eligible status to avoid races.
  params.push(booking.booking_number);
  const update = await query(
    `UPDATE bookings
     SET ${sets.join(", ")}
     WHERE UPPER(booking_number) = UPPER($${params.length})
       AND booking_status = ANY($${params.length + 1}::text[])
     RETURNING id`,
    [...params, ["pending", "confirmed"]]
  );

  if (update.rows.length === 0) {
    throw new AppError(
      "Booking is already cancelled or can no longer be cancelled online",
      400
    );
  }

  const updated = await fetchPublicBooking(bookingNumber);
  notifyBookingStatusChange(booking, updated);

  return sendSuccess(res, 200, {
    message: "Booking cancelled",
    data: toPublicBookingPayload(updated),
  });
});

/**
 * Guest stay-modification preview. Contact-verified; excludes this booking from
 * sold counts; never writes. Amounts are always server-calculated.
 */
const previewModifyBookingByNumber = asyncHandler(async (req, res) => {
  const resolved = await resolveGuestStayModification(req, res, {
    requireStayChange: false,
  });
  if (!resolved) return;

  const {
    booking,
    proposed,
    amounts,
    availability,
    roomType,
    dirty,
  } = resolved;

  const availableRooms = Number(availability?.available_rooms) || 0;
  const stopSell = Boolean(availability?.stop_sell);
  const isAvailable =
    Boolean(availability) &&
    !stopSell &&
    availableRooms >= proposed.numberOfRooms;

  return sendSuccess(res, 200, {
    data: {
      eligible: canGuestModifyStayBooking(booking.booking_status),
      dirty,
      booking_number: booking.booking_number,
      hotel_slug: booking.hotel_slug,
      hotel_name: booking.hotel_name,
      check_in_date: proposed.checkIn,
      check_out_date: proposed.checkOut,
      nights: nightsBetween(proposed.checkIn, proposed.checkOut),
      room_type_id: proposed.roomTypeId,
      room_type_slug: roomType?.slug || booking.room_type_slug,
      room_type_name: roomType?.name || booking.room_type_name,
      number_of_rooms: proposed.numberOfRooms,
      available_rooms: availableRooms,
      booked_rooms: Number(availability?.booked_rooms) || 0,
      total_rooms: Number(availability?.total_rooms) || 0,
      stop_sell: stopSell,
      is_available: isAvailable,
      nightly_rate: amounts?.nightly_rate ?? null,
      on_request: Boolean(amounts?.on_request),
      subtotal: amounts?.subtotal ?? 0,
      tax_amount: amounts?.tax_amount ?? 0,
      total_amount: amounts?.total_amount ?? 0,
      currency: booking.currency || booking.currency_code || "INR",
    },
  });
});

/**
 * Guest self-service stay modification. Reuses applyBookingStayUpdate with
 * guest-eligible statuses only. Pricing is always recalculated server-side.
 */
const modifyBookingByNumber = asyncHandler(async (req, res) => {
  const resolved = await resolveGuestStayModification(req, res, {
    requireStayChange: true,
  });
  if (!resolved) return;

  const { booking, proposed, amounts, dirty } = resolved;

  if (!dirty) {
    return sendSuccess(res, 200, {
      message: "No stay changes applied",
      data: toPublicBookingPayload(booking),
    });
  }

  const columnUpdates = {
    check_in_date: proposed.checkIn,
    check_out_date: proposed.checkOut,
    room_type_id: proposed.roomTypeId,
    number_of_rooms: proposed.numberOfRooms,
    subtotal: amounts.subtotal,
    tax_amount: amounts.tax_amount,
    total_amount: amounts.total_amount,
  };

  let roomIdToKeep = null;
  if (booking.room_id) {
    if (
      proposed.numberOfRooms > 1 ||
      proposed.roomTypeId !== booking.room_type_id
    ) {
      columnUpdates.room_id = null;
    } else {
      roomIdToKeep = booking.room_id;
    }
  }

  await bookingService.applyBookingStayUpdate({
    bookingId: booking.id,
    hotelId: booking.hotel_id,
    previousRoomTypeId: booking.room_type_id,
    roomTypeId: proposed.roomTypeId,
    checkIn: proposed.checkIn,
    checkOut: proposed.checkOut,
    numberOfRooms: proposed.numberOfRooms,
    columnUpdates,
    roomIdToKeep,
    allowedStatuses: GUEST_SELF_SERVICE_STATUSES,
    requireActiveRoomType: true,
  });

  const updated = await fetchPublicBooking(booking.booking_number);
  notifyBookingStatusUpdate(
    {
      ...updated,
      guest_email: booking.guest_email,
      guest_name: booking.guest_name || updated.guest_name,
      notification_preferences: updated.notification_preferences,
    },
    booking.booking_status
  );

  return sendSuccess(res, 200, {
    message: "Stay updated",
    data: toPublicBookingPayload(updated),
  });
});

/**
 * Guest self-service notification preference update. Contact-verified.
 * Does not alter transactional confirm/cancel email behaviour.
 */
const updateNotificationPreferencesByNumber = asyncHandler(async (req, res) => {
  const bookingNumber = trimOrNull(req.params.bookingNumber);
  const body = req.body || {};
  const email = trimOrNull(body.email);
  const phone = trimOrNull(body.phone);

  if (!email && !phone) {
    return sendValidationError(res, [
      "Provide the email or phone used for the booking to update preferences",
    ]);
  }

  const notFound = new AppError(
    "No booking found matching that reference and contact detail",
    404
  );
  if (!bookingNumber) throw notFound;

  const booking = await fetchPublicBooking(bookingNumber);
  if (!booking) throw notFound;
  if (!verifyPublicBookingContact(booking, email, phone)) throw notFound;

  const prefsParse = parseNotificationPreferences(body.notification_preferences, {
    partial: true,
    base: booking.notification_preferences,
  });
  if (body.notification_preferences === undefined) {
    return sendValidationError(res, ["notification_preferences is required"]);
  }
  if (!prefsParse.ok) {
    return sendValidationError(res, prefsParse.errors);
  }

  await query(
    `UPDATE bookings
     SET notification_preferences = $1::jsonb
     WHERE UPPER(booking_number) = UPPER($2)`,
    [JSON.stringify(prefsParse.value), booking.booking_number]
  );

  const updated = await fetchPublicBooking(bookingNumber);
  return sendSuccess(res, 200, {
    message: "Notification preferences updated",
    data: toPublicBookingPayload(updated),
  });
});

module.exports = {
  getAvailability,
  createBooking,
  getBookingByNumber,
  cancelBookingByNumber,
  previewModifyBookingByNumber,
  modifyBookingByNumber,
  updateNotificationPreferencesByNumber,
};
