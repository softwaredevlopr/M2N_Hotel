const { query } = require("../config/db");
const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/error.middleware");
const bookingService = require("../services/booking.service");
const {
  BOOKING_SOURCES,
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  TERMINAL_BOOKING_STATUSES,
  canTransitionBookingStatus,
  BOOKING_STATUS_TRANSITIONS,
} = require("../utils/bookingConstants");
const {
  UUID_REGEX,
  parseAmount,
  parseDate,
  parseInteger,
  parseUuid,
  trimOrNull,
  validateGuestFields,
  validateStayDates,
} = require("../validators/booking.validator");

const MAX_ADULTS = 30;
const MAX_CHILDREN = 30;
const MAX_ROOMS = 20;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const BOOKING_FIELDS = `
  b.id, b.booking_number, b.hotel_id, b.room_type_id, b.room_id,
  b.guest_name, b.guest_email, b.guest_phone,
  -- Rendered as plain calendar dates: a DATE serialised through JSON as a
  -- timestamp shifts a day for clients east/west of UTC.
  to_char(b.check_in_date, 'YYYY-MM-DD') AS check_in_date,
  to_char(b.check_out_date, 'YYYY-MM-DD') AS check_out_date,
  b.adults, b.children, b.number_of_rooms,
  b.booking_source, b.booking_status, b.payment_status, b.special_requests,
  b.subtotal, b.tax_amount, b.total_amount, b.currency,
  b.created_by_admin_id, b.confirmed_at, b.cancelled_at, b.cancellation_reason,
  b.created_at, b.updated_at,
  h.slug AS hotel_slug, h.name AS hotel_name,
  rt.slug AS room_type_slug, rt.name AS room_type_name,
  r.room_number,
  a.full_name AS created_by_admin_name
`;

const BOOKING_JOINS = `
  FROM bookings b
  INNER JOIN hotels h ON h.id = b.hotel_id
  INNER JOIN room_types rt ON rt.id = b.room_type_id
  LEFT JOIN rooms r ON r.id = b.room_id
  LEFT JOIN admin_users a ON a.id = b.created_by_admin_id
`;

function toIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function fetchBookingById(id) {
  const result = await query(
    `SELECT ${BOOKING_FIELDS} ${BOOKING_JOINS} WHERE b.id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function requireBooking(id) {
  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Booking not found: ${id}`, 404);
  }
  const booking = await fetchBookingById(id);
  if (!booking) {
    throw new AppError(`Booking not found: ${id}`, 404);
  }
  return booking;
}

const listBookings = asyncHandler(async (req, res) => {
  const conditions = [];
  const params = [];

  if (
    typeof req.query.hotel_id === "string" &&
    UUID_REGEX.test(req.query.hotel_id)
  ) {
    params.push(req.query.hotel_id);
    conditions.push(`b.hotel_id = $${params.length}`);
  }

  if (
    typeof req.query.room_type_id === "string" &&
    UUID_REGEX.test(req.query.room_type_id)
  ) {
    params.push(req.query.room_type_id);
    conditions.push(`b.room_type_id = $${params.length}`);
  }

  if (
    typeof req.query.booking_status === "string" &&
    BOOKING_STATUSES.includes(req.query.booking_status)
  ) {
    params.push(req.query.booking_status);
    conditions.push(`b.booking_status = $${params.length}`);
  }

  if (
    typeof req.query.payment_status === "string" &&
    PAYMENT_STATUSES.includes(req.query.payment_status)
  ) {
    params.push(req.query.payment_status);
    conditions.push(`b.payment_status = $${params.length}`);
  }

  if (
    typeof req.query.booking_source === "string" &&
    BOOKING_SOURCES.includes(req.query.booking_source)
  ) {
    params.push(req.query.booking_source);
    conditions.push(`b.booking_source = $${params.length}`);
  }

  const dateErrors = [];
  const checkInFrom = parseDate(
    req.query.check_in_from,
    "check_in_from",
    dateErrors,
    { required: false }
  );
  const checkInTo = parseDate(req.query.check_in_to, "check_in_to", dateErrors, {
    required: false,
  });
  if (dateErrors.length > 0) {
    return sendValidationError(res, dateErrors);
  }

  if (checkInFrom) {
    params.push(checkInFrom);
    conditions.push(`b.check_in_date >= $${params.length}`);
  }
  if (checkInTo) {
    params.push(checkInTo);
    conditions.push(`b.check_in_date <= $${params.length}`);
  }

  const search = trimOrNull(req.query.search);
  if (search) {
    params.push(`%${search}%`);
    const likeIdx = params.length;
    params.push(`%${search.replace(/\D/g, "")}%`);
    const digitsIdx = params.length;
    conditions.push(
      `(b.booking_number ILIKE $${likeIdx}
        OR b.guest_name ILIKE $${likeIdx}
        OR b.guest_email ILIKE $${likeIdx}
        OR (
          length($${digitsIdx}) > 2
          AND regexp_replace(b.guest_phone, '\\D', '', 'g') LIKE $${digitsIdx}
        ))`
    );
  }

  const limit = (() => {
    const parsed = Number(req.query.limit);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
    return Math.min(Math.floor(parsed), MAX_LIMIT);
  })();
  const offset = (() => {
    const parsed = Number(req.query.offset);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
  })();

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT ${BOOKING_FIELDS}, COUNT(*) OVER()::int AS total_count
     ${BOOKING_JOINS}
     ${where}
     ORDER BY b.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  const total = result.rows.length > 0 ? result.rows[0].total_count : 0;
  const data = result.rows.map(({ total_count: _ignored, ...row }) => row);

  return sendSuccess(res, 200, {
    count: data.length,
    total,
    limit,
    offset,
    data,
  });
});

const getBookingById = asyncHandler(async (req, res) => {
  const booking = await requireBooking(req.params.id);
  return sendSuccess(res, 200, { data: booking });
});

const createBooking = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const errors = [];

  const hotelId = parseUuid(body.hotel_id, "hotel_id", errors);
  const roomTypeId = parseUuid(body.room_type_id, "room_type_id", errors);
  const guest = validateGuestFields(body, errors);

  const checkIn = parseDate(body.check_in_date, "check_in_date", errors);
  const checkOut = parseDate(body.check_out_date, "check_out_date", errors);
  // Staff record walk-ins and phone bookings after the fact, so past arrival
  // dates are permitted here but not on the public endpoint.
  validateStayDates(checkIn, checkOut, errors, { allowPastDates: true });

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

  const bookingSource = trimOrNull(body.booking_source) || "admin";
  if (!BOOKING_SOURCES.includes(bookingSource)) {
    errors.push(`booking_source must be one of: ${BOOKING_SOURCES.join(", ")}`);
  }

  const bookingStatus = trimOrNull(body.booking_status) || "confirmed";
  if (!["pending", "confirmed"].includes(bookingStatus)) {
    errors.push("booking_status must be pending or confirmed on creation");
  }

  const paymentStatus = trimOrNull(body.payment_status) || "unpaid";
  if (!PAYMENT_STATUSES.includes(paymentStatus)) {
    errors.push(
      `payment_status must be one of: ${PAYMENT_STATUSES.join(", ")}`
    );
  }

  const subtotal = parseAmount(body.subtotal, "subtotal", errors);
  const taxAmount = parseAmount(body.tax_amount, "tax_amount", errors);
  const totalAmount = parseAmount(body.total_amount, "total_amount", errors, {
    fallback: null,
  });

  const currency = trimOrNull(body.currency);
  if (currency && !/^[A-Za-z]{3}$/.test(currency)) {
    errors.push("currency must be a 3-letter code");
  }

  const specialRequests = trimOrNull(body.special_requests);

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

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
    booking_source: bookingSource,
    booking_status: bookingStatus,
    payment_status: paymentStatus,
    special_requests: specialRequests,
    subtotal,
    tax_amount: taxAmount,
    total_amount:
      totalAmount === null
        ? Math.round((subtotal + taxAmount) * 100) / 100
        : totalAmount,
    currency: currency ? currency.toUpperCase() : null,
    created_by_admin_id: req.admin?.id || null,
    require_active_hotel: false,
    require_active_room_type: false,
  });

  return sendSuccess(res, 201, { data: await fetchBookingById(bookingId) });
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await requireBooking(req.params.id);
  const body = req.body || {};
  const errors = [];

  const nextBookingStatus = trimOrNull(body.booking_status);
  const nextPaymentStatus = trimOrNull(body.payment_status);
  const cancellationReason = trimOrNull(body.cancellation_reason);

  if (!nextBookingStatus && !nextPaymentStatus) {
    errors.push("Provide booking_status or payment_status");
  }

  if (nextBookingStatus && !BOOKING_STATUSES.includes(nextBookingStatus)) {
    errors.push(
      `booking_status must be one of: ${BOOKING_STATUSES.join(", ")}`
    );
  }

  if (nextPaymentStatus && !PAYMENT_STATUSES.includes(nextPaymentStatus)) {
    errors.push(
      `payment_status must be one of: ${PAYMENT_STATUSES.join(", ")}`
    );
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  if (
    nextBookingStatus &&
    !canTransitionBookingStatus(booking.booking_status, nextBookingStatus)
  ) {
    const allowed = BOOKING_STATUS_TRANSITIONS[booking.booking_status] || [];
    throw new AppError(
      allowed.length === 0
        ? `Booking is ${booking.booking_status} and can no longer change status`
        : `Cannot change booking status from ${booking.booking_status} to ${nextBookingStatus}. Allowed: ${allowed.join(", ")}`,
      400
    );
  }

  const sets = [];
  const params = [];

  if (nextBookingStatus) {
    params.push(nextBookingStatus);
    sets.push(`booking_status = $${params.length}`);

    if (nextBookingStatus === "confirmed") {
      sets.push("confirmed_at = COALESCE(confirmed_at, NOW())");
    }
    if (nextBookingStatus === "cancelled") {
      sets.push("cancelled_at = COALESCE(cancelled_at, NOW())");
    }
  }

  if (nextPaymentStatus) {
    params.push(nextPaymentStatus);
    sets.push(`payment_status = $${params.length}`);
  }

  if (cancellationReason !== null) {
    params.push(cancellationReason);
    sets.push(`cancellation_reason = $${params.length}`);
  }

  params.push(booking.id);
  await query(
    `UPDATE bookings SET ${sets.join(", ")} WHERE id = $${params.length}`,
    params
  );

  return sendSuccess(res, 200, { data: await fetchBookingById(booking.id) });
});

/**
 * Attaches (or clears) a physical room. The schema carries a single room_id, so
 * assignment is only meaningful for single-room reservations.
 */
const assignRoom = asyncHandler(async (req, res) => {
  const booking = await requireBooking(req.params.id);
  const roomIdRaw = trimOrNull((req.body || {}).room_id);

  if (roomIdRaw === null) {
    await query(`UPDATE bookings SET room_id = NULL WHERE id = $1`, [
      booking.id,
    ]);
    return sendSuccess(res, 200, {
      message: "Room unassigned",
      data: await fetchBookingById(booking.id),
    });
  }

  if (!UUID_REGEX.test(roomIdRaw)) {
    return sendValidationError(res, ["room_id must be a valid UUID"]);
  }

  if (["cancelled", "no_show"].includes(booking.booking_status)) {
    throw new AppError(
      `Cannot assign a room to a ${booking.booking_status} booking`,
      409
    );
  }

  if (booking.number_of_rooms > 1) {
    throw new AppError(
      "Room assignment supports single-room bookings only; split this reservation first",
      409
    );
  }

  await bookingService.assertRoomAssignable({
    bookingId: booking.id,
    roomId: roomIdRaw,
    hotelId: booking.hotel_id,
    roomTypeId: booking.room_type_id,
    checkIn: toIsoDate(booking.check_in_date),
    checkOut: toIsoDate(booking.check_out_date),
  });

  await query(`UPDATE bookings SET room_id = $1 WHERE id = $2`, [
    roomIdRaw,
    booking.id,
  ]);

  return sendSuccess(res, 200, {
    message: "Room assigned",
    data: await fetchBookingById(booking.id),
  });
});

const updateBooking = asyncHandler(async (req, res) => {
  const booking = await requireBooking(req.params.id);
  const body = req.body || {};
  const errors = [];
  const updates = {};

  const guest = validateGuestFields(body, errors, { partial: true });
  Object.assign(updates, guest);

  if (body.room_type_id !== undefined) {
    const roomTypeId = parseUuid(body.room_type_id, "room_type_id", errors);
    if (roomTypeId) updates.room_type_id = roomTypeId;
  }

  if (body.check_in_date !== undefined) {
    const value = parseDate(body.check_in_date, "check_in_date", errors);
    if (value) updates.check_in_date = value;
  }
  if (body.check_out_date !== undefined) {
    const value = parseDate(body.check_out_date, "check_out_date", errors);
    if (value) updates.check_out_date = value;
  }

  const checkIn = updates.check_in_date || toIsoDate(booking.check_in_date);
  const checkOut = updates.check_out_date || toIsoDate(booking.check_out_date);
  if (updates.check_in_date || updates.check_out_date) {
    validateStayDates(checkIn, checkOut, errors, { allowPastDates: true });
  }

  if (body.adults !== undefined) {
    const value = parseInteger(body.adults, "adults", errors, {
      min: 1,
      max: MAX_ADULTS,
      fallback: undefined,
    });
    if (value !== undefined) updates.adults = value;
  }
  if (body.children !== undefined) {
    const value = parseInteger(body.children, "children", errors, {
      min: 0,
      max: MAX_CHILDREN,
      fallback: undefined,
    });
    if (value !== undefined) updates.children = value;
  }
  if (body.number_of_rooms !== undefined) {
    const value = parseInteger(
      body.number_of_rooms,
      "number_of_rooms",
      errors,
      { min: 1, max: MAX_ROOMS, fallback: undefined }
    );
    if (value !== undefined) updates.number_of_rooms = value;
  }

  if (body.booking_source !== undefined) {
    const source = trimOrNull(body.booking_source);
    if (!source || !BOOKING_SOURCES.includes(source)) {
      errors.push(
        `booking_source must be one of: ${BOOKING_SOURCES.join(", ")}`
      );
    } else {
      updates.booking_source = source;
    }
  }

  if (body.payment_status !== undefined) {
    const status = trimOrNull(body.payment_status);
    if (!status || !PAYMENT_STATUSES.includes(status)) {
      errors.push(
        `payment_status must be one of: ${PAYMENT_STATUSES.join(", ")}`
      );
    } else {
      updates.payment_status = status;
    }
  }

  if (body.special_requests !== undefined) {
    const value = trimOrNull(body.special_requests);
    if (value && value.length > 2000) {
      errors.push("special_requests must be at most 2000 characters");
    } else {
      updates.special_requests = value;
    }
  }

  if (body.cancellation_reason !== undefined) {
    updates.cancellation_reason = trimOrNull(body.cancellation_reason);
  }

  if (body.subtotal !== undefined) {
    updates.subtotal = parseAmount(body.subtotal, "subtotal", errors);
  }
  if (body.tax_amount !== undefined) {
    updates.tax_amount = parseAmount(body.tax_amount, "tax_amount", errors);
  }
  if (body.total_amount !== undefined) {
    updates.total_amount = parseAmount(
      body.total_amount,
      "total_amount",
      errors
    );
  }

  if (body.currency !== undefined) {
    const currency = trimOrNull(body.currency);
    if (!currency || !/^[A-Za-z]{3}$/.test(currency)) {
      errors.push("currency must be a 3-letter code");
    } else {
      updates.currency = currency.toUpperCase();
    }
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const columns = Object.keys(updates);
  if (columns.length === 0) {
    return sendValidationError(res, ["No fields provided to update"]);
  }

  const inventoryChanged =
    updates.room_type_id !== undefined ||
    updates.check_in_date !== undefined ||
    updates.check_out_date !== undefined ||
    updates.number_of_rooms !== undefined;

  if (inventoryChanged) {
    if (TERMINAL_BOOKING_STATUSES.includes(booking.booking_status)) {
      throw new AppError(
        `Stay details cannot be changed on a ${booking.booking_status} booking`,
        409
      );
    }

    const roomTypeId = updates.room_type_id || booking.room_type_id;
    const numberOfRooms = updates.number_of_rooms || booking.number_of_rooms;

    await bookingService.revalidateBookingInventory({
      bookingId: booking.id,
      hotelId: booking.hotel_id,
      roomTypeId,
      checkIn,
      checkOut,
      numberOfRooms,
    });

    // A room already attached must still be valid for the new type/dates.
    if (booking.room_id) {
      if (numberOfRooms > 1 || updates.room_type_id) {
        updates.room_id = null;
      } else {
        await bookingService.assertRoomAssignable({
          bookingId: booking.id,
          roomId: booking.room_id,
          hotelId: booking.hotel_id,
          roomTypeId,
          checkIn,
          checkOut,
        });
      }
    }
  }

  const sets = [];
  const params = [];
  Object.keys(updates).forEach((column) => {
    params.push(updates[column]);
    sets.push(`${column} = $${params.length}`);
  });
  params.push(booking.id);

  await query(
    `UPDATE bookings SET ${sets.join(", ")} WHERE id = $${params.length}`,
    params
  );

  return sendSuccess(res, 200, { data: await fetchBookingById(booking.id) });
});

module.exports = {
  listBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  assignRoom,
  updateBooking,
};
