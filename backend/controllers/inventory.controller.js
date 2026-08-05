const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const inventoryService = require("../services/inventory.service");
const {
  parseDate,
  parseUuid,
  trimOrNull,
} = require("../validators/booking.validator");

function parseCalendarQuery(req, { requireHotelId = false } = {}) {
  const q = req.query || {};
  const errors = [];

  const hotelId = parseUuid(q.hotel_id, "hotel_id", errors, {
    required: requireHotelId,
  });
  const hotelSlug = trimOrNull(q.hotel_slug);
  const roomTypeId = parseUuid(q.room_type_id, "room_type_id", errors, {
    required: false,
  });

  if (!hotelId && !hotelSlug) {
    errors.push("Provide hotel_id or hotel_slug");
  }

  const from = parseDate(q.from, "from", errors);
  const to = parseDate(q.to, "to", errors);

  if (from && to && to < from) {
    errors.push("to must be on or after from");
  }

  return { hotelId, hotelSlug, roomTypeId, from, to, errors };
}

/**
 * Admin inventory calendar — reusable for a future calendar UI.
 * GET /api/admin/inventory/calendar
 */
const getAdminInventoryCalendar = asyncHandler(async (req, res) => {
  const { hotelId, hotelSlug, roomTypeId, from, to, errors } =
    parseCalendarQuery(req, { requireHotelId: false });
  if (errors.length > 0) return sendValidationError(res, errors);

  const data = await inventoryService.getInventoryCalendar({
    hotelId,
    hotelSlug,
    roomTypeId,
    from,
    to,
    requireActiveHotel: false,
    activeRoomTypesOnly: false,
  });

  return sendSuccess(res, 200, { data });
});

/**
 * Admin single-day inventory for one room type.
 * GET /api/admin/inventory/day
 */
const getAdminInventoryDay = asyncHandler(async (req, res) => {
  const q = req.query || {};
  const errors = [];
  const hotelId = parseUuid(q.hotel_id, "hotel_id", errors);
  const roomTypeId = parseUuid(q.room_type_id, "room_type_id", errors);
  const date = parseDate(q.date, "date", errors);
  if (errors.length > 0) return sendValidationError(res, errors);

  const hotel = await inventoryService.resolveHotel({ hotelId });
  const day = await inventoryService.getDayInventory({
    hotelId: hotel.id,
    roomTypeId,
    date,
  });

  return sendSuccess(res, 200, {
    data: {
      hotel_id: hotel.id,
      hotel_slug: hotel.slug,
      hotel_name: hotel.name,
      room_type_id: roomTypeId,
      ...day,
      stop_sell_supported: false,
      allotment_supported: false,
    },
  });
});

/**
 * Admin overlap diagnostic — bookings holding inventory across a stay window.
 * GET /api/admin/inventory/overlaps
 */
const getAdminInventoryOverlaps = asyncHandler(async (req, res) => {
  const q = req.query || {};
  const errors = [];
  const hotelId = parseUuid(q.hotel_id, "hotel_id", errors);
  const roomTypeId = parseUuid(q.room_type_id, "room_type_id", errors);
  const checkIn = parseDate(q.check_in_date, "check_in_date", errors);
  const checkOut = parseDate(q.check_out_date, "check_out_date", errors);
  const excludeBookingId = parseUuid(
    q.exclude_booking_id,
    "exclude_booking_id",
    errors,
    { required: false }
  );

  if (checkIn && checkOut && checkOut <= checkIn) {
    errors.push("check_out_date must be after check_in_date");
  }
  if (errors.length > 0) return sendValidationError(res, errors);

  const hotel = await inventoryService.resolveHotel({ hotelId });
  const stay = await inventoryService.getStayPeakSold({
    hotelId: hotel.id,
    roomTypeId,
    checkIn,
    checkOut,
    excludeBookingId,
  });
  const overlaps = await inventoryService.findOverlappingBookings({
    hotelId: hotel.id,
    roomTypeId,
    checkIn,
    checkOut,
    excludeBookingId,
  });

  return sendSuccess(res, 200, {
    data: {
      hotel_id: hotel.id,
      room_type_id: roomTypeId,
      check_in_date: checkIn,
      check_out_date: checkOut,
      inventory: stay,
      overlapping_bookings: overlaps,
      overlap_count: overlaps.length,
    },
  });
});

/**
 * Public calendar-ready availability for future UI widgets.
 * Does not replace GET /api/bookings/availability (stay-range peak + pricing).
 * GET /api/bookings/availability/calendar
 */
const getPublicInventoryCalendar = asyncHandler(async (req, res) => {
  const { hotelId, hotelSlug, roomTypeId, from, to, errors } =
    parseCalendarQuery(req);
  if (errors.length > 0) return sendValidationError(res, errors);

  const data = await inventoryService.getInventoryCalendar({
    hotelId,
    hotelSlug,
    roomTypeId,
    from,
    to,
    requireActiveHotel: true,
    activeRoomTypesOnly: true,
  });

  return sendSuccess(res, 200, { data });
});

module.exports = {
  getAdminInventoryCalendar,
  getAdminInventoryDay,
  getAdminInventoryOverlaps,
  getPublicInventoryCalendar,
};
