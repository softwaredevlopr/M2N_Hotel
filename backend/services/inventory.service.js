const { query } = require("../config/db");
const { AppError } = require("../middleware/error.middleware");
const {
  INVENTORY_BLOCKING_STATUSES,
  SELLABLE_ROOM_STATUSES,
} = require("../utils/bookingConstants");

/** Soft cap so calendar queries cannot span an unbounded date range. */
const MAX_CALENDAR_DAYS = 92;

/**
 * Phase 10D inventory engine.
 *
 * Availability is derived (ADR-0014): sellable physical rooms minus rooms held
 * by inventory-blocking bookings on each half-open night. There is no stop-sell
 * / allotment table — those features are documented as pending until a schema
 * change is approved.
 *
 * Night occupancy predicates mirror booking.service peakBookedRooms so calendar
 * day D matches checkAvailability({ checkIn: D, checkOut: D+1 }).
 */

function assertDateRange(from, to) {
  if (!from || !to) {
    throw new AppError("from and to dates are required", 400);
  }
  if (to < from) {
    throw new AppError("to must be on or after from", 400);
  }
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  const days = Math.round((end - start) / 86400000) + 1;
  if (days > MAX_CALENDAR_DAYS) {
    throw new AppError(
      `Date range cannot exceed ${MAX_CALENDAR_DAYS} days`,
      400
    );
  }
  return days;
}

async function resolveHotel({ hotelId, hotelSlug, requireActive = false }) {
  let result;
  if (hotelId) {
    result = await query(
      `SELECT id, slug, name, status, currency_code
       FROM hotels WHERE id = $1 LIMIT 1`,
      [hotelId]
    );
  } else if (hotelSlug) {
    result = await query(
      `SELECT id, slug, name, status, currency_code
       FROM hotels WHERE slug = $1 LIMIT 1`,
      [hotelSlug]
    );
  } else {
    throw new AppError("Provide hotel_id or hotel_slug", 400);
  }

  if (result.rows.length === 0) {
    throw new AppError("Hotel not found", 404);
  }
  const hotel = result.rows[0];
  if (requireActive && hotel.status !== "active") {
    throw new AppError("Hotel is not available", 404);
  }
  return hotel;
}

async function loadRoomTypes(hotelId, roomTypeId = null, { activeOnly = false } = {}) {
  const params = [hotelId];
  let sql = `
    SELECT id, slug, name, status, base_price, max_occupancy, bed_type
    FROM room_types
    WHERE hotel_id = $1`;
  if (activeOnly) {
    sql += ` AND status = 'active'`;
  }
  if (roomTypeId) {
    params.push(roomTypeId);
    sql += ` AND id = $${params.length}`;
  }
  sql += ` ORDER BY sort_order ASC, name ASC`;

  const result = await query(sql, params);
  if (roomTypeId && result.rows.length === 0) {
    throw new AppError("Room type not found for this hotel", 404);
  }
  return result.rows;
}

/**
 * Sellable physical capacity for a room type (read-only; no row locks).
 * Matches booking.service countSellableRooms statuses.
 */
async function countSellableRooms(hotelId, roomTypeId) {
  const result = await query(
    `SELECT COUNT(*)::int AS total
     FROM rooms
     WHERE hotel_id = $1
       AND room_type_id = $2
       AND status = ANY($3::text[])`,
    [hotelId, roomTypeId, SELLABLE_ROOM_STATUSES]
  );
  return result.rows[0].total;
}

/**
 * Per-night sold counts for one or more room types across [from, to] inclusive.
 * Checkout nights are free (half-open stays).
 */
async function getNightlySoldCounts({
  roomTypeIds,
  from,
  to,
  excludeBookingId = null,
}) {
  if (!Array.isArray(roomTypeIds) || roomTypeIds.length === 0) {
    return new Map();
  }

  const result = await query(
    `WITH nights AS (
       SELECT generate_series($2::date, $3::date, INTERVAL '1 day')::date AS night
     ),
     types AS (
       SELECT UNNEST($1::uuid[]) AS room_type_id
     )
     SELECT t.room_type_id,
            n.night::text AS night,
            COALESCE(SUM(b.number_of_rooms), 0)::int AS sold_count
     FROM types t
     CROSS JOIN nights n
     LEFT JOIN bookings b
       ON b.room_type_id = t.room_type_id
      AND b.booking_status = ANY($4::text[])
      AND b.check_in_date <= n.night
      AND b.check_out_date > n.night
      AND ($5::uuid IS NULL OR b.id <> $5::uuid)
     GROUP BY t.room_type_id, n.night
     ORDER BY t.room_type_id, n.night`,
    [
      roomTypeIds,
      from,
      to,
      INVENTORY_BLOCKING_STATUSES,
      excludeBookingId,
    ]
  );

  const map = new Map();
  result.rows.forEach((row) => {
    const key = row.room_type_id;
    if (!map.has(key)) map.set(key, new Map());
    map.get(key).set(String(row.night).slice(0, 10), row.sold_count);
  });
  return map;
}

function buildDayRow(date, totalRooms, soldCount) {
  const sold = Number(soldCount) || 0;
  const total = Number(totalRooms) || 0;
  const remaining = Math.max(total - sold, 0);
  return {
    date,
    total_rooms: total,
    sold_count: sold,
    booked_rooms: sold,
    remaining_count: remaining,
    available_rooms: remaining,
    is_sold_out: total === 0 || remaining === 0,
    // Stop-sell is not persisted in the schema yet (Phase 10D pending product
    // decision / migration approval). Always false; clients can key off
    // stop_sell_supported.
    stop_sell: false,
    stop_sell_supported: false,
  };
}

/**
 * Single-night inventory for one hotel + room type.
 */
async function getDayInventory({ hotelId, roomTypeId, date }) {
  if (!date) throw new AppError("date is required", 400);
  const total = await countSellableRooms(hotelId, roomTypeId);
  const soldMap = await getNightlySoldCounts({
    roomTypeIds: [roomTypeId],
    from: date,
    to: date,
  });
  const sold = soldMap.get(roomTypeId)?.get(date) || 0;
  return buildDayRow(date, total, sold);
}

/**
 * Peak sold rooms across a multi-night stay (half-open). Same definition as
 * booking.service.getAvailability.booked_rooms.
 */
async function getStayPeakSold({
  hotelId,
  roomTypeId,
  checkIn,
  checkOut,
  excludeBookingId = null,
}) {
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    throw new AppError("check_out_date must be after check_in_date", 400);
  }
  const total = await countSellableRooms(hotelId, roomTypeId);
  // Peak over [checkIn, checkOut) = nights from checkIn through checkOut-1.
  const lastNight = (() => {
    const d = new Date(`${checkOut}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  if (lastNight < checkIn) {
    return {
      total_rooms: total,
      sold_count: 0,
      booked_rooms: 0,
      remaining_count: total,
      available_rooms: total,
    };
  }

  const soldMap = await getNightlySoldCounts({
    roomTypeIds: [roomTypeId],
    from: checkIn,
    to: lastNight,
    excludeBookingId,
  });
  const nights = soldMap.get(roomTypeId) || new Map();
  let peak = 0;
  nights.forEach((sold) => {
    if (sold > peak) peak = sold;
  });
  const remaining = Math.max(total - peak, 0);
  return {
    total_rooms: total,
    sold_count: peak,
    booked_rooms: peak,
    remaining_count: remaining,
    available_rooms: remaining,
  };
}

/**
 * Bookings that overlap a stay window for a hotel room type (inventory-blocking
 * statuses only). Useful for admin diagnostics / calendar drill-down.
 */
async function findOverlappingBookings({
  hotelId,
  roomTypeId,
  checkIn,
  checkOut,
  excludeBookingId = null,
}) {
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    throw new AppError("check_out_date must be after check_in_date", 400);
  }

  const result = await query(
    `SELECT b.id, b.booking_number, b.guest_name,
            to_char(b.check_in_date, 'YYYY-MM-DD') AS check_in_date,
            to_char(b.check_out_date, 'YYYY-MM-DD') AS check_out_date,
            b.number_of_rooms, b.booking_status, b.payment_status
     FROM bookings b
     WHERE b.hotel_id = $1
       AND b.room_type_id = $2
       AND b.booking_status = ANY($3::text[])
       AND b.check_in_date < $5::date
       AND b.check_out_date > $4::date
       AND ($6::uuid IS NULL OR b.id <> $6::uuid)
     ORDER BY b.check_in_date ASC, b.booking_number ASC`,
    [
      hotelId,
      roomTypeId,
      INVENTORY_BLOCKING_STATUSES,
      checkIn,
      checkOut,
      excludeBookingId,
    ]
  );
  return result.rows;
}

/**
 * Hotel-wise (and optional room-type-wise) inventory calendar for [from, to].
 */
async function getInventoryCalendar({
  hotelId = null,
  hotelSlug = null,
  roomTypeId = null,
  from,
  to,
  requireActiveHotel = false,
  activeRoomTypesOnly = false,
  excludeBookingId = null,
}) {
  assertDateRange(from, to);
  const hotel = await resolveHotel({
    hotelId,
    hotelSlug,
    requireActive: requireActiveHotel,
  });
  const roomTypes = await loadRoomTypes(hotel.id, roomTypeId, {
    activeOnly: activeRoomTypesOnly,
  });

  const typeIds = roomTypes.map((rt) => rt.id);
  const soldByType = await getNightlySoldCounts({
    roomTypeIds: typeIds,
    from,
    to,
    excludeBookingId,
  });

  const totals = {};
  await Promise.all(
    typeIds.map(async (id) => {
      totals[id] = await countSellableRooms(hotel.id, id);
    })
  );

  // Inclusive date list
  const days = [];
  {
    const cursor = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);
    while (cursor <= end) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  const room_types = roomTypes.map((rt) => {
    const nightMap = soldByType.get(rt.id) || new Map();
    const total = totals[rt.id] || 0;
    return {
      room_type_id: rt.id,
      slug: rt.slug,
      name: rt.name,
      status: rt.status,
      max_occupancy: rt.max_occupancy,
      bed_type: rt.bed_type,
      total_rooms: total,
      days: days.map((date) =>
        buildDayRow(date, total, nightMap.get(date) || 0)
      ),
    };
  });

  return {
    hotel_id: hotel.id,
    hotel_slug: hotel.slug,
    hotel_name: hotel.name,
    currency: hotel.currency_code || "INR",
    from,
    to,
    stop_sell_supported: false,
    allotment_supported: false,
    overbooking_allowance_supported: false,
    room_types,
  };
}

module.exports = {
  MAX_CALENDAR_DAYS,
  countSellableRooms,
  getDayInventory,
  getStayPeakSold,
  findOverlappingBookings,
  getInventoryCalendar,
  resolveHotel,
  // Exported for tests / parity checks
  getNightlySoldCounts,
  buildDayRow,
};
