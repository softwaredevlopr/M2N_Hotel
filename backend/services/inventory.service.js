const { query } = require("../config/db");
const { AppError } = require("../middleware/error.middleware");
const {
  INVENTORY_BLOCKING_STATUSES,
  SELLABLE_ROOM_STATUSES,
} = require("../utils/bookingConstants");
const {
  computeNightAvailability,
  loadInventoryOverrides,
  summarizeStayAvailability,
} = require("./inventoryCapacity");

/** Soft cap so calendar queries cannot span an unbounded date range. */
const MAX_CALENDAR_DAYS = 92;

/**
 * Inventory calendar / day engine (Phase 10D + 10I).
 *
 * Night D availability uses room_type_inventory_dates overrides when present:
 *   base = COALESCE(allotment, physical)
 *   sell_limit = base + overbooking_allowance
 *   available = stop_sell ? 0 : max(0, sell_limit - sold)
 * Missing override rows keep Phase 10D physical − sold behaviour.
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

function buildDayRow(date, physicalTotal, soldCount, override = null) {
  const night = computeNightAvailability({
    physical: physicalTotal,
    sold: soldCount,
    allotment: override ? override.allotment : null,
    stopSell: override ? override.stop_sell : false,
    overbookingAllowance: override ? override.overbooking_allowance : 0,
  });
  const available = night.available_for_sale;
  return {
    date,
    total_rooms: night.physical_total,
    physical_total: night.physical_total,
    allotment: night.allotment,
    overbooking_allowance: night.overbooking_allowance,
    sell_limit: night.sell_limit,
    sold_count: night.sold_count,
    booked_rooms: night.sold_count,
    remaining_count: available,
    available_rooms: available,
    is_sold_out: night.stop_sell || available === 0,
    stop_sell: night.stop_sell,
    stop_sell_supported: true,
    allotment_supported: true,
    overbooking_allowance_supported: true,
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
  const overrides = await loadInventoryOverrides(query, {
    hotelId,
    roomTypeIds: [roomTypeId],
    from: date,
    to: date,
  });
  const override = overrides.get(roomTypeId)?.get(date) || null;
  return buildDayRow(date, total, sold, override);
}

/**
 * Stay-window inventory — same definition as booking.service.getAvailability.
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
  const lastNight = (() => {
    const d = new Date(`${checkOut}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  if (lastNight < checkIn) {
    return {
      total_rooms: total,
      physical_total: total,
      sold_count: 0,
      booked_rooms: 0,
      remaining_count: total,
      available_rooms: total,
      stop_sell: false,
      sell_limit: total,
    };
  }

  const soldMap = await getNightlySoldCounts({
    roomTypeIds: [roomTypeId],
    from: checkIn,
    to: lastNight,
    excludeBookingId,
  });
  const nightsSoldMap = soldMap.get(roomTypeId) || new Map();
  const overridesByType = await loadInventoryOverrides(query, {
    hotelId,
    roomTypeIds: [roomTypeId],
    from: checkIn,
    to: lastNight,
  });
  const overridesByDate = overridesByType.get(roomTypeId) || new Map();
  const summary = summarizeStayAvailability({
    physical: total,
    nightsSoldMap,
    overridesByDate,
    checkIn,
    checkOut,
  });

  return {
    total_rooms: summary.total_rooms,
    physical_total: summary.total_rooms,
    sold_count: summary.booked_rooms,
    booked_rooms: summary.booked_rooms,
    remaining_count: summary.available_rooms,
    available_rooms: summary.available_rooms,
    stop_sell: summary.stop_sell,
    sell_limit: summary.min_sell_limit,
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
  const overridesByType = await loadInventoryOverrides(query, {
    hotelId: hotel.id,
    roomTypeIds: typeIds,
    from,
    to,
  });

  const totals = {};
  await Promise.all(
    typeIds.map(async (id) => {
      totals[id] = await countSellableRooms(hotel.id, id);
    })
  );

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
    const overrideMap = overridesByType.get(rt.id) || new Map();
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
        buildDayRow(
          date,
          total,
          nightMap.get(date) || 0,
          overrideMap.get(date) || null
        )
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
    stop_sell_supported: true,
    allotment_supported: true,
    overbooking_allowance_supported: true,
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
