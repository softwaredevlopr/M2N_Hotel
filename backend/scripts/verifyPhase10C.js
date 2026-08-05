/**
 * Phase 10C admin bookings verification.
 * Uses a signed JWT from an existing admin_users row (same approach as testBookings).
 * Does not invent credentials or change schema.
 *
 * Usage: node scripts/verifyPhase10C.js   (server must be running on :5001)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");
const { signAdminToken } = require("../utils/adminAuth");

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
  check("backend health", health.status === 200 && health.body?.status === "healthy");

  const adminResult = await query(
    `SELECT id, email, role FROM admin_users WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1`
  );
  const admin = adminResult.rows[0];
  check("active admin exists", Boolean(admin));
  if (!admin) throw new Error("No admin — run npm run seed:admin");

  const rooms = await query(
    `SELECT rt.id AS room_type_id, rt.hotel_id, h.slug AS hotel_slug
     FROM room_types rt
     INNER JOIN hotels h ON h.id = rt.hotel_id
     WHERE rt.status = 'active' AND h.status = 'active'
     ORDER BY rt.created_at ASC LIMIT 1`
  );
  const fixture = rooms.rows[0];
  check("active hotel/room type fixture", Boolean(fixture));
  if (!fixture) throw new Error("No fixture room type");

  const token = signAdminToken(admin);
  const checkIn = isoDaysFromNow(40);
  const checkOut = isoDaysFromNow(42);

  section("Auth gate");
  const unauth = await api("GET", "/api/admin/bookings");
  check("unauthenticated list returns 401", unauth.status === 401);
  const unauthStats = await api("GET", "/api/admin/bookings/stats");
  check("unauthenticated stats returns 401", unauthStats.status === 401);
  const unauthDetail = await api(
    "GET",
    "/api/admin/bookings/00000000-0000-0000-0000-000000000001"
  );
  check("unauthenticated detail returns 401", unauthDetail.status === 401);

  section("Create fixture booking via admin API");
  const created = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase10C Verifier",
      guest_email: "phase10c-verify@booking-selftest.invalid",
      guest_phone: "+91 98765 00010",
      check_in_date: checkIn,
      check_out_date: checkOut,
      adults: 2,
      children: 0,
      number_of_rooms: 1,
      booking_status: "pending",
      special_requests: "Verification booking",
    },
  });
  check("admin create returns 201", created.status === 201, `got ${created.status}`);
  const booking = created.body?.data;
  if (booking?.booking_number) createdBookingNumbers.push(booking.booking_number);
  check("created booking has id + number", Boolean(booking?.id && booking?.booking_number));

  section("List / search / filters / sort / pagination");
  const list = await api("GET", "/api/admin/bookings?limit=10&offset=0", { token });
  check("authenticated list 200", list.status === 200);
  check("list has data array", Array.isArray(list.body?.data));
  check("list has total/limit/offset", typeof list.body?.total === "number");

  const searched = await api(
    "GET",
    `/api/admin/bookings?search=${encodeURIComponent(booking.booking_number)}`,
    { token }
  );
  check(
    "search by booking number",
    searched.status === 200 &&
      (searched.body?.data || []).some((b) => b.id === booking.id)
  );

  const byHotel = await api(
    "GET",
    `/api/admin/bookings?hotel_id=${fixture.hotel_id}&limit=50`,
    { token }
  );
  check(
    "hotel filter",
    byHotel.status === 200 &&
      (byHotel.body?.data || []).every((b) => b.hotel_id === fixture.hotel_id)
  );

  const byStatus = await api(
    "GET",
    "/api/admin/bookings?booking_status=pending&limit=50",
    { token }
  );
  check(
    "status filter",
    byStatus.status === 200 &&
      (byStatus.body?.data || []).every((b) => b.booking_status === "pending")
  );

  const byDate = await api(
    "GET",
    `/api/admin/bookings?check_in_from=${checkIn}&check_in_to=${checkIn}`,
    { token }
  );
  check(
    "date filter",
    byDate.status === 200 &&
      (byDate.body?.data || []).every(
        (b) => String(b.check_in_date).slice(0, 10) === checkIn
      )
  );

  const sorted = await api(
    "GET",
    "/api/admin/bookings?sort=guest_name&order=asc&limit=5",
    { token }
  );
  check(
    "sorting",
    sorted.status === 200 &&
      sorted.body?.sort === "guest_name" &&
      sorted.body?.order === "asc"
  );

  const page2 = await api("GET", "/api/admin/bookings?limit=1&offset=1", { token });
  check(
    "pagination",
    page2.status === 200 &&
      page2.body?.limit === 1 &&
      page2.body?.offset === 1 &&
      (page2.body?.data || []).length <= 1
  );

  section("Detail");
  const detail = await api("GET", `/api/admin/bookings/${booking.id}`, { token });
  check("detail 200", detail.status === 200);
  check(
    "detail fields",
    detail.body?.data?.guest_name === "Phase10C Verifier" &&
      detail.body?.data?.special_requests === "Verification booking" &&
      detail.body?.data?.hotel_name
  );

  section("Stats");
  const stats = await api("GET", "/api/admin/bookings/stats", { token });
  check("stats 200", stats.status === 200);
  check(
    "stats shape",
    typeof stats.body?.data?.arrivals_today === "number" &&
      typeof stats.body?.data?.departures_today === "number" &&
      typeof stats.body?.data?.upcoming === "number" &&
      stats.body?.data?.by_status &&
      stats.body?.data?.occupancy
  );

  section("Status transitions + cancellation_reason");
  const illegal = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
    token,
    body: { booking_status: "checked_out" },
  });
  check("blocks pending → checked_out", illegal.status === 400);

  const confirm = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
    token,
    body: { booking_status: "confirmed" },
  });
  check("confirm pending → confirmed", confirm.status === 200);
  check("stamps confirmed_at", Boolean(confirm.body?.data?.confirmed_at));

  const cancel = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
    token,
    body: {
      booking_status: "cancelled",
      cancellation_reason: "Phase 10C verification cancel",
    },
  });
  check("cancel confirmed → cancelled", cancel.status === 200);
  check(
    "persists cancellation_reason",
    cancel.body?.data?.cancellation_reason === "Phase 10C verification cancel"
  );
  check("stamps cancelled_at", Boolean(cancel.body?.data?.cancelled_at));

  const terminal = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
    token,
    body: { booking_status: "confirmed" },
  });
  check("blocks transition from cancelled", terminal.status === 400);

  // Separate booking for no_show reason path
  const pending2 = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase10C NoShow",
      guest_email: "phase10c-noshow@booking-selftest.invalid",
      guest_phone: "+91 98765 00011",
      check_in_date: isoDaysFromNow(50),
      check_out_date: isoDaysFromNow(51),
      booking_status: "pending",
    },
  });
  if (pending2.body?.data?.booking_number) {
    createdBookingNumbers.push(pending2.body.data.booking_number);
  }
  const noShow = await api(
    "PATCH",
    `/api/admin/bookings/${pending2.body?.data?.id}/status`,
    {
      token,
      body: {
        booking_status: "no_show",
        cancellation_reason: "Guest did not arrive — verification",
      },
    }
  );
  check("pending → no_show", noShow.status === 200);
  check(
    "no_show stores cancellation_reason",
    noShow.body?.data?.cancellation_reason ===
      "Guest did not arrive — verification"
  );
  check("no_show stamps cancelled_at", Boolean(noShow.body?.data?.cancelled_at));

  section("Regression — public surfaces");
  const hotels = await api("GET", "/api/hotels");
  check("public hotels still work", hotels.status === 200);
  const roomTypes = await api("GET", "/api/rooms/types");
  check("public room types still work", roomTypes.status === 200);
  const availability = await api(
    "GET",
    `/api/bookings/availability?hotel_slug=${encodeURIComponent(
      fixture.hotel_slug
    )}&check_in_date=${isoDaysFromNow(60)}&check_out_date=${isoDaysFromNow(62)}`
  );
  check("public availability still work", availability.status === 200);

  section("Schema guard — no admin_notes on bookings");
  const cols = await query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'bookings' AND column_name = 'admin_notes'`
  );
  check("bookings.admin_notes does not exist", cols.rows.length === 0);

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
