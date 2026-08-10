/**
 * Phase 10D inventory engine verification.
 * Validates per-day calendar maths against booking.service.checkAvailability
 * and exercises admin + public calendar/overlap APIs. No schema changes.
 *
 * Usage: node scripts/verifyPhase10D.js   (server must be running)
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
  if (createdBookingNumbers.length === 0) return;
  const result = await query(
    `DELETE FROM bookings WHERE booking_number = ANY($1::text[]) RETURNING booking_number`,
    [createdBookingNumbers]
  );
  console.log(`\nCleaned up ${result.rows.length} verification booking(s).`);
}

async function main() {
  const health = await api("GET", "/health");
  check("backend health", health.status === 200);

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
      `SELECT rt.id AS room_type_id, rt.hotel_id, h.slug AS hotel_slug, rt.name
       FROM room_types rt
       INNER JOIN hotels h ON h.id = rt.hotel_id
       WHERE rt.status = 'active' AND h.status = 'active'
       ORDER BY rt.created_at ASC LIMIT 1`
    )
  ).rows[0];
  check("fixture room type", Boolean(fixture));

  const token = signAdminToken(admin);
  const day = isoDaysFromNow(70);
  const day2 = addDays(day, 1);
  const day3 = addDays(day, 2);
  const rangeEnd = addDays(day, 6);

  section("Service — per-day parity with checkAvailability");
  const serviceDay = await inventoryService.getDayInventory({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    date: day,
  });
  const bookingDay = await bookingService.checkAvailability({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    checkIn: day,
    checkOut: day2,
  });
  check(
    "day sold_count == checkAvailability.booked_rooms",
    serviceDay.sold_count === bookingDay.booked_rooms,
    `${serviceDay.sold_count} vs ${bookingDay.booked_rooms}`
  );
  check(
    "day remaining == checkAvailability.available_rooms",
    serviceDay.remaining_count === bookingDay.available_rooms,
    `${serviceDay.remaining_count} vs ${bookingDay.available_rooms}`
  );
  check(
    "day total_rooms matches",
    serviceDay.total_rooms === bookingDay.total_rooms
  );

  section("Create overlapping booking then re-check sold count");
  const created = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase10D Inventory",
      guest_email: "phase10d@booking-selftest.invalid",
      guest_phone: "+91 98765 00020",
      check_in_date: day,
      check_out_date: day3,
      number_of_rooms: 1,
      booking_status: "confirmed",
    },
  });
  check("create fixture booking", created.status === 201, `got ${created.status}`);
  if (created.body?.data?.booking_number) {
    createdBookingNumbers.push(created.body.data.booking_number);
  }

  const after = await inventoryService.getDayInventory({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    date: day,
  });
  check("sold_count increased after booking", after.sold_count >= 1);
  check(
    "checkout night remains free",
    (
      await inventoryService.getDayInventory({
        hotelId: fixture.hotel_id,
        roomTypeId: fixture.room_type_id,
        date: day3,
      })
    ).sold_count ===
      (
        await bookingService.checkAvailability({
          hotelId: fixture.hotel_id,
          roomTypeId: fixture.room_type_id,
          checkIn: day3,
          checkOut: addDays(day3, 1),
        })
      ).booked_rooms
  );

  const stayPeak = await inventoryService.getStayPeakSold({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    checkIn: day,
    checkOut: day3,
  });
  const stayCheck = await bookingService.checkAvailability({
    hotelId: fixture.hotel_id,
    roomTypeId: fixture.room_type_id,
    checkIn: day,
    checkOut: day3,
  });
  check(
    "stay peak matches checkAvailability",
    stayPeak.booked_rooms === stayCheck.booked_rooms &&
      stayPeak.available_rooms === stayCheck.available_rooms
  );

  section("Admin inventory APIs");
  const unauth = await api(
    "GET",
    `/api/admin/inventory/calendar?hotel_id=${fixture.hotel_id}&from=${day}&to=${rangeEnd}`
  );
  check("admin calendar requires auth", unauth.status === 401);

  const calendar = await api(
    "GET",
    `/api/admin/inventory/calendar?hotel_id=${fixture.hotel_id}&from=${day}&to=${rangeEnd}&room_type_id=${fixture.room_type_id}`,
    { token }
  );
  check("admin calendar 200", calendar.status === 200, `got ${calendar.status}`);
  check(
    "calendar hotel-wise + room-type filter",
    calendar.body?.data?.hotel_id === fixture.hotel_id &&
      (calendar.body?.data?.room_types || []).length === 1
  );
  const calDay = (calendar.body?.data?.room_types?.[0]?.days || []).find(
    (d) => d.date === day
  );
  check(
    "calendar day has sold/remaining fields",
    calDay &&
      typeof calDay.sold_count === "number" &&
      typeof calDay.remaining_count === "number" &&
      calDay.stop_sell_supported === true
  );
  check("stop-sell flagged supported at hotel level", calendar.body?.data?.stop_sell_supported === true);

  const dayApi = await api(
    "GET",
    `/api/admin/inventory/day?hotel_id=${fixture.hotel_id}&room_type_id=${fixture.room_type_id}&date=${day}`,
    { token }
  );
  check("admin day 200", dayApi.status === 200);
  check(
    "day API sold_count present",
    typeof dayApi.body?.data?.sold_count === "number"
  );

  const overlaps = await api(
    "GET",
    `/api/admin/inventory/overlaps?hotel_id=${fixture.hotel_id}&room_type_id=${fixture.room_type_id}&check_in_date=${day}&check_out_date=${day3}`,
    { token }
  );
  check("overlaps 200", overlaps.status === 200);
  check(
    "detects overlapping booking",
    overlaps.body?.data?.overlap_count >= 1 &&
      (overlaps.body?.data?.overlapping_bookings || []).some(
        (b) => b.id === created.body?.data?.id
      )
  );

  section("Public calendar API");
  const publicCal = await api(
    "GET",
    `/api/bookings/availability/calendar?hotel_slug=${encodeURIComponent(
      fixture.hotel_slug
    )}&from=${day}&to=${rangeEnd}`
  );
  check("public calendar 200", publicCal.status === 200, `got ${publicCal.status}`);
  check(
    "public calendar returns room_types",
    Array.isArray(publicCal.body?.data?.room_types)
  );

  const stayAvail = await api(
    "GET",
    `/api/bookings/availability?hotel_slug=${encodeURIComponent(
      fixture.hotel_slug
    )}&check_in_date=${day}&check_out_date=${day3}`
  );
  check("existing stay availability still works", stayAvail.status === 200);

  section("Schema guard — inventory dates table owns stop_sell columns");
  const legacyCols = await query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name IN ('bookings','rooms','room_types','hotels')
       AND column_name IN ('stop_sell','allotment','overbooking_allowance')`
  );
  check(
    "no stop_sell/allotment on legacy booking tables",
    legacyCols.rows.length === 0
  );
  const invCols = await query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'room_type_inventory_dates'
       AND column_name IN ('stop_sell','allotment','overbooking_allowance')`
  );
  check(
    "room_type_inventory_dates has stop_sell/allotment/overbooking",
    invCols.rows.length === 3
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
