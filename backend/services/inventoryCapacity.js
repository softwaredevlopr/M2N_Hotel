/**
 * Shared inventory capacity rules for room_type_inventory_dates.
 *
 * Formula (night D):
 *   physical     = sellable rooms count
 *   base         = COALESCE(allotment, physical)
 *   sell_limit   = base + overbooking_allowance
 *   sold         = blocking bookings on D
 *   available    = stop_sell ? 0 : max(0, sell_limit - sold)
 */

function computeNightAvailability({
  physical = 0,
  sold = 0,
  allotment = null,
  stopSell = false,
  overbookingAllowance = 0,
}) {
  const physicalTotal = Number(physical) || 0;
  const soldCount = Number(sold) || 0;
  const allowance = Number(overbookingAllowance) || 0;
  const hasAllotment = allotment !== null && allotment !== undefined;
  const baseCapacity = hasAllotment ? Number(allotment) : physicalTotal;
  const sellLimit = baseCapacity + allowance;
  const stop = Boolean(stopSell);
  const availableForSale = stop ? 0 : Math.max(sellLimit - soldCount, 0);

  return {
    physical_total: physicalTotal,
    allotment: hasAllotment ? Number(allotment) : null,
    stop_sell: stop,
    overbooking_allowance: allowance,
    base_capacity: baseCapacity,
    sell_limit: sellLimit,
    sold_count: soldCount,
    available_for_sale: availableForSale,
    remaining_count: Math.max(sellLimit - soldCount, 0),
  };
}

/**
 * Load sparse overrides for room types over an inclusive date range.
 * Returns Map<roomTypeId, Map<isoDate, row>>.
 * `executor` may be a pg client/pool (`executor.query`) or the shared `query` fn.
 */
async function loadInventoryOverrides(
  executor,
  { hotelId, roomTypeIds, from, to }
) {
  const map = new Map();
  if (!Array.isArray(roomTypeIds) || roomTypeIds.length === 0) return map;

  const run =
    typeof executor === "function"
      ? (sql, params) => executor(sql, params)
      : (sql, params) => executor.query(sql, params);

  const result = await run(
    `SELECT room_type_id,
            to_char(inventory_date, 'YYYY-MM-DD') AS inventory_date,
            allotment, stop_sell, overbooking_allowance
     FROM room_type_inventory_dates
     WHERE hotel_id = $1
       AND room_type_id = ANY($2::uuid[])
       AND inventory_date >= $3::date
       AND inventory_date <= $4::date`,
    [hotelId, roomTypeIds, from, to]
  );

  result.rows.forEach((row) => {
    const typeId = row.room_type_id;
    if (!map.has(typeId)) map.set(typeId, new Map());
    map.get(typeId).set(row.inventory_date, {
      allotment: row.allotment === null ? null : Number(row.allotment),
      stop_sell: Boolean(row.stop_sell),
      overbooking_allowance: Number(row.overbooking_allowance) || 0,
    });
  });

  return map;
}

/**
 * Stay-window availability using per-night sell limits and stop-sell.
 * Nights are half-open: [checkIn, checkOut).
 */
function summarizeStayAvailability({
  physical,
  nightsSoldMap,
  overridesByDate,
  checkIn,
  checkOut,
}) {
  const nights = [];
  const cursor = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  while (cursor < end) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (nights.length === 0) {
    return {
      total_rooms: physical,
      booked_rooms: 0,
      available_rooms: physical,
      stop_sell: false,
      peak_sold: 0,
      min_sell_limit: physical,
    };
  }

  let peakSold = 0;
  let minAvailable = Infinity;
  let anyStopSell = false;
  let minSellLimit = Infinity;

  nights.forEach((date) => {
    const override = overridesByDate?.get(date) || null;
    const sold = nightsSoldMap?.get(date) || 0;
    const night = computeNightAvailability({
      physical,
      sold,
      allotment: override ? override.allotment : null,
      stopSell: override ? override.stop_sell : false,
      overbookingAllowance: override ? override.overbooking_allowance : 0,
    });
    if (night.sold_count > peakSold) peakSold = night.sold_count;
    if (night.available_for_sale < minAvailable) {
      minAvailable = night.available_for_sale;
    }
    if (night.sell_limit < minSellLimit) minSellLimit = night.sell_limit;
    if (night.stop_sell) anyStopSell = true;
  });

  if (minAvailable === Infinity) minAvailable = 0;
  if (minSellLimit === Infinity) minSellLimit = physical;

  return {
    total_rooms: physical,
    booked_rooms: peakSold,
    available_rooms: anyStopSell ? 0 : minAvailable,
    stop_sell: anyStopSell,
    peak_sold: peakSold,
    min_sell_limit: minSellLimit,
  };
}

module.exports = {
  computeNightAvailability,
  loadInventoryOverrides,
  summarizeStayAvailability,
};
