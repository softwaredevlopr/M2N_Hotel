/**
 * Phase 10I persistent inventory dates verification.
 * Exercises stop-sell, allotment, and overbooking_allowance against
 * booking.service + inventory.service and admin calendar APIs.
 *
 * Usage: node scripts/verifyPhase10I.js   (server must be running; migrate applied)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");
const { signAdminToken } = require("../utils/adminAuth");
const bookingService = require("../services/booking.service");
const inventoryService = require("../services/inventory.service");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";

let passed = 0;
let failed = 0;
const createdBookingNumbers = [];
const createdInventoryIds = [];

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function api(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, body: json };
}

function isoDaysFromNow(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function cleanup() {
  if (createdBookingNumbers.length > 0) {
    const result = await query(
      `DELETE FROM bookings WHERE booking_number = ANY($1::text[]) RETURNING booking_number`,
      [createdBookingNumbers]
    );
    console.log(`\nCleaned up ${result.rows.length} verification booking(s).`);
  }
  if (createdInventoryIds.length > 0) {
    const result = await query(
      `DELETE FROM room_type_inventory_dates WHERE id = ANY($1::uuid[]) RETURNING id`,
      [createdInventoryIds]
    );
    console.log(`Cleaned up ${result.rows.length} inventory override row(s).`);
  }
}

async function insertOverride({
  hotelId,
  roomTypeId,
  date,
  allotment = null,
  stopSell = false,
  overbookingAllowance = 0,
}) {
  const result = await query(
    `INSERT INTO room_type_inventory_dates
       (hotel_id, room_type_id, inventory_date, allotment, stop_sell, overbooking_allowance, source)
     VALUES ($1, $2, $3::date, $4, $5, $6, 'system')
     ON CONFLICT (hotel_id, room_type_id, inventory_date)
     DO UPDATE SET
       allotment = EXCLUDED.allotment,
       stop_sell = EXCLUDED.stop_sell,
       overbooking_allowance = EXCLUDED.overbooking_allowance,
       source = EXCLUDED.source,
       updated_at = NOW()
     RETURNING id`,
    [hotelId, roomTypeId, date, allotment, stopSell, overbookingAllowance]
  );
  const id = result.rows[0].id;
  if (!createdInventoryIds.includes(id)) createdInventoryIds.push(id);
  return id;
}

async function main() {
  const health = await api("GET", "/health");
  check("backend health", health.status === 200);

  section("Schema — room_type_inventory_dates");
  const table = await query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_name = 'room_type_inventory_dates'
     ORDER BY ordinal_position`
  );
  const colNames = table.rows.map((r) => r.column_name);
  const expected = [
    "id",
    "hotel_id",
    "room_type_id",
    "inventory_date",
    "allotment",
    "stop_sell",
    "overbooking_allowance",
    "notes",
    "source",
    "external_ref",
    "created_at",
    "updated_at",
  ];
  check(
    "table has approved columns",
    expected.every((c) => colNames.includes(c)) && colNames.length === expected.length,
    `got [${colNames.join(", ")}]`
  );

  const admin = (
    await query(
      `SELECT id, email, role FROM admin_users WHERE is_active = TRUE
       ORDER BY created_at ASC LIMIT 1`
    )
  ).rows[0];
  check("active admin exists", Boolean(admin));
  if (!admin) throw new Error("No admin");

  const fixture = (
    await query(
      `SELECT rt.id AS room_type_id, rt.hotel_id, h.slug AS hotel_slug,
              (
                SELECT COUNT(*)::int FROM rooms r
                WHERE r.hotel_id = rt.hotel_id
                  AND r.room_type_id = rt.id
                  AND r.status IN ('available', 'occupied')
              ) AS physical
       FROM room_types rt
       INNER JOIN hotels h ON h.id = rt.hotel_id
       WHERE rt.status = 'active' AND h.status = 'active'
       ORDER BY physical DESC, rt.created_at ASC
       LIMIT 1`
    )
  ).rows[0];
  check("fixture room type with physical > 0", Boolean(fixture) && fixture.physical > 0);
  if (!fixture || fixture.physical <= 0) throw new Error("Need sellable rooms");

  const token = signAdminToken(admin);
  const day = isoDaysFromNow(85);
  const day2 = addDays(day, 1);
  const day3 = addDays(day, 2);
  const physical = fixture.physical;

  section("Sparse default — missing row = Phase 10D behaviour");
  const baseline = await bookingService.checkAvailability({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    checkIn: day,
    checkOut: day2,
  });
  check(
    "baseline available equals physical - sold",
    baseline.available_rooms === Math.max(physical - baseline.booked_rooms, 0),
    `${baseline.available_rooms} vs physical ${physical} sold ${baseline.booked_rooms}`
  );
  check("baseline stop_sell false", baseline.stop_sell === false);

  section("Stop-sell blocks booking");
  await insertOverride({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    date: day,
    stopSell: true,
  });
  const stopped = await bookingService.checkAvailability({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    checkIn: day,
    checkOut: day2,
  });
  check("stop-sell available_rooms = 0", stopped.available_rooms === 0);
  check("stop-sell flag true", stopped.stop_sell === true);

  const stopCreate = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase10I StopSell",
      guest_email: "phase10i-stop@booking-selftest.invalid",
      guest_phone: "+91 98765 00030",
      check_in_date: day,
      check_out_date: day2,
      number_of_rooms: 1,
      booking_status: "confirmed",
    },
  });
  check("stop-sell create returns 409", stopCreate.status === 409, `got ${stopCreate.status}`);
  if (stopCreate.body?.data?.booking_number) {
    createdBookingNumbers.push(stopCreate.body.data.booking_number);
  }

  const dayApi = await api(
    "GET",
    `/api/admin/inventory/day?hotel_id=${fixture.hotel_id}&room_type_id=${fixture.room_type_id}&date=${day}`,
    { token }
  );
  check("admin day shows stop_sell", dayApi.body?.data?.stop_sell === true);
  check("admin day stop_sell_supported", dayApi.body?.data?.stop_sell_supported === true);

  section("Allotment caps sellable inventory");
  await insertOverride({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    date: day,
    allotment: 1,
    stopSell: false,
    overbookingAllowance: 0,
  });
  const allotmentAvail = await bookingService.checkAvailability({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    checkIn: day,
    checkOut: day2,
  });
  check(
    "allotment sell_limit = 1 when no sold",
    allotmentAvail.available_rooms === Math.max(1 - allotmentAvail.booked_rooms, 0),
    `available=${allotmentAvail.available_rooms} sold=${allotmentAvail.booked_rooms}`
  );

  const invDay = await inventoryService.getDayInventory({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    date: day,
  });
  check("day sell_limit = allotment", invDay.sell_limit === 1);
  check("day allotment field = 1", invDay.allotment === 1);

  section("Overbooking allowance expands sell_limit");
  await insertOverride({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    date: day,
    allotment: null,
    stopSell: false,
    overbookingAllowance: 2,
  });
  const overAvail = await bookingService.checkAvailability({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    checkIn: day,
    checkOut: day2,
  });
  check(
    "overbooking available = physical + 2 - sold",
    overAvail.available_rooms ===
      Math.max(physical + 2 - overAvail.booked_rooms, 0),
    `available=${overAvail.available_rooms} physical=${physical}`
  );

  const overDay = await inventoryService.getDayInventory({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    date: day,
  });
  check("day overbooking_allowance = 2", overDay.overbooking_allowance === 2);
  check("day sell_limit = physical + 2", overDay.sell_limit === physical + 2);

  section("Stay min-across-nights + stop-sell on one night");
  await insertOverride({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    date: day,
    allotment: null,
    stopSell: false,
    overbookingAllowance: 0,
  });
  await insertOverride({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    date: day2,
    stopSell: true,
  });
  const stay = await bookingService.checkAvailability({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    checkIn: day,
    checkOut: day3,
  });
  check("any-night stop-sell zeros stay available", stay.available_rooms === 0);
  check("stay stop_sell true", stay.stop_sell === true);

  section("Calendar flags supported");
  const calendar = await api(
    "GET",
    `/api/admin/inventory/calendar?hotel_id=${fixture.hotel_id}&from=${day}&to=${day3}&room_type_id=${fixture.room_type_id}`,
    { token }
  );
  check("calendar 200", calendar.status === 200);
  check("calendar allotment_supported", calendar.body?.data?.allotment_supported === true);
  check(
    "calendar overbooking_allowance_supported",
    calendar.body?.data?.overbooking_allowance_supported === true
  );
  const calDay2 = (calendar.body?.data?.room_types?.[0]?.days || []).find(
    (d) => d.date === day2
  );
  check("calendar day2 stop_sell true", calDay2?.stop_sell === true);

  section("Public stay availability request shape unchanged");
  const publicAvail = await api(
    "GET",
    `/api/bookings/availability?hotel_slug=${encodeURIComponent(
      fixture.hotel_slug
    )}&check_in_date=${day}&check_out_date=${day3}&number_of_rooms=1`
  );
  check("public availability 200", publicAvail.status === 200);
  check(
    "public room_types array present",
    Array.isArray(publicAvail.body?.data?.room_types)
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  await cleanup();
  await pool.end();
  if (failed > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  try {
    await cleanup();
  } catch {
    /* ignore */
  }
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
