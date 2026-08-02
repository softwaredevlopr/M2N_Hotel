const { query } = require("../config/db");
const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/error.middleware");
const bookingService = require("../services/booking.service");
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
  b.subtotal, b.tax_amount, b.total_amount, b.currency,
  b.created_at, b.confirmed_at, b.cancelled_at,
  h.slug AS hotel_slug, h.name AS hotel_name, h.city AS hotel_city,
  h.check_in_time, h.check_out_time,
  rt.slug AS room_type_slug, rt.name AS room_type_name,
  r.room_number
`;

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

/**
 * Indicative pricing from the room type's configured base price. Guest-supplied
 * amounts are never trusted; staff can adjust the reservation afterwards. A base
 * price of 0 means "on request" and leaves the totals at zero.
 */
function buildIndicativeAmounts(basePrice, nights, rooms) {
  const price = Number(basePrice);
  if (!Number.isFinite(price) || price <= 0) {
    return { subtotal: 0, tax_amount: 0, total_amount: 0 };
  }
  const subtotal = Math.round(price * nights * rooms * 100) / 100;
  return { subtotal, tax_amount: 0, total_amount: subtotal };
}

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

  return sendSuccess(res, 201, {
    message:
      "Booking request received. Our team will confirm your reservation shortly.",
    data: { ...created.rows[0], nights },
  });
});

/**
 * Guest self-service lookup. The caller must prove ownership with the email or
 * phone on the reservation. A wrong booking number and a failed verification
 * return the identical 404 so the endpoint cannot be used to discover which
 * booking references exist.
 */
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

  const emailMatches =
    Boolean(email) &&
    booking.guest_email.toLowerCase() === email.toLowerCase();
  const phoneMatches =
    Boolean(phone) &&
    normalizePhoneForMatch(booking.guest_phone) ===
      normalizePhoneForMatch(phone);

  if (!emailMatches && !phoneMatches) throw notFound;

  const { guest_email: _email, guest_phone: _phone, ...safe } = booking;

  return sendSuccess(res, 200, {
    data: {
      ...safe,
      nights: nightsBetween(booking.check_in_date, booking.check_out_date),
    },
  });
});

module.exports = {
  createBooking,
  getBookingByNumber,
};
