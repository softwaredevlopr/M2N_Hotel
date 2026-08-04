/**
 * Phase 10A booking API verification.
 *
 * Development-only smoke test. Exercises the public and admin booking routes
 * against a running server, then removes every booking it created so the
 * database is left exactly as it was found.
 *
 * Usage: node scripts/testBookings.js   (server must be running)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");
const { signAdminToken } = require("../utils/adminAuth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";
const TEST_EMAIL_DOMAIN = "booking-selftest.invalid";

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

function guest(overrides = {}) {
  return {
    guest_name: "Selftest Guest",
    guest_email: `selftest@${TEST_EMAIL_DOMAIN}`,
    guest_phone: "+91 98765 43210",
    ...overrides,
  };
}

function track(result) {
  const number = result?.body?.data?.booking_number;
  if (number) createdBookingNumbers.push(number);
  return result;
}

async function loadFixtures() {
  const rooms = await query(
    `SELECT rt.id AS room_type_id, rt.hotel_id, rt.name AS room_type_name,
            rt.status AS room_type_status, h.slug AS hotel_slug, h.status AS hotel_status,
            COUNT(r.id)::int AS room_count
     FROM room_types rt
     INNER JOIN hotels h ON h.id = rt.hotel_id
     LEFT JOIN rooms r ON r.room_type_id = rt.id
       AND r.status IN ('available', 'occupied')
     GROUP BY rt.id, rt.hotel_id, rt.name, rt.status, h.slug, h.status
     ORDER BY room_count DESC, rt.name ASC`
  );

  const admin = await query(
    `SELECT id, email, role FROM admin_users WHERE is_active = TRUE
     ORDER BY created_at ASC LIMIT 1`
  );

  return { roomTypes: rooms.rows, admin: admin.rows[0] || null };
}

async function cleanup() {
  if (createdBookingNumbers.length === 0) return;
  const result = await query(
    `DELETE FROM bookings WHERE booking_number = ANY($1::text[]) RETURNING booking_number`,
    [createdBookingNumbers]
  );
  console.log(`\nCleaned up ${result.rows.length} test booking(s).`);

  const leftovers = await query(
    `SELECT COUNT(*)::int AS n FROM bookings WHERE guest_email LIKE $1`,
    [`%@${TEST_EMAIL_DOMAIN}`]
  );
  if (leftovers.rows[0].n > 0) {
    await query(`DELETE FROM bookings WHERE guest_email LIKE $1`, [
      `%@${TEST_EMAIL_DOMAIN}`,
    ]);
    console.log(`Removed ${leftovers.rows[0].n} stray self-test booking(s).`);
  }
}

async function main() {
  const health = await api("GET", "/health");
  if (health.status !== 200) {
    throw new Error(`Server not reachable at ${BASE_URL} — start it first`);
  }

  const { roomTypes, admin } = await loadFixtures();
  const withRooms = roomTypes.find(
    (rt) => rt.room_count > 0 && rt.hotel_status === "active" && rt.room_type_status === "active"
  );
  if (!withRooms) throw new Error("No active room type with rooms found to test against");
  if (!admin) throw new Error("No active admin user found — run npm run seed:admin");

  const other = roomTypes.find((rt) => rt.hotel_id !== withRooms.hotel_id);
  const token = signAdminToken(admin);

  console.log(
    `Fixture: ${withRooms.hotel_slug} / ${withRooms.room_type_name} (${withRooms.room_count} sellable room(s))`
  );

  const checkIn = isoDaysFromNow(30);
  const checkOut = isoDaysFromNow(32);

  // -------------------------------------------------------------------------
  section("Public POST /api/bookings — happy path");
  const created = track(
    await api("POST", "/api/bookings", {
      body: {
        hotel_id: withRooms.hotel_id,
        room_type_id: withRooms.room_type_id,
        ...guest(),
        check_in_date: checkIn,
        check_out_date: checkOut,
        adults: 2,
        children: 1,
        number_of_rooms: 1,
        special_requests: "High floor if possible",
      },
    })
  );
  check("returns 201", created.status === 201, `got ${created.status}`);
  check(
    "issues a booking_number",
    /^M2N-\d{8}-[A-Z0-9]{5}$/.test(created.body?.data?.booking_number || ""),
    created.body?.data?.booking_number
  );
  check(
    "defaults to pending / unpaid",
    created.body?.data?.booking_status === "pending" &&
      created.body?.data?.payment_status === "unpaid"
  );
  check("computes nights", created.body?.data?.nights === 2);
  check(
    "hides internal ids from the guest payload",
    created.body?.data &&
      !("id" in created.body.data) &&
      !("hotel_id" in created.body.data) &&
      !("created_by_admin_id" in created.body.data)
  );

  const bookingNumber = created.body?.data?.booking_number;

  // -------------------------------------------------------------------------
  section("Public GET /api/bookings/availability");
  const availability = await api(
    "GET",
    `/api/bookings/availability?hotel_slug=${encodeURIComponent(
      withRooms.hotel_slug
    )}&check_in_date=${checkIn}&check_out_date=${checkOut}&number_of_rooms=1`
  );
  check("returns 200", availability.status === 200, `got ${availability.status}`);
  check(
    "includes hotel + nights",
    availability.body?.data?.hotel_slug === withRooms.hotel_slug &&
      availability.body?.data?.nights === 2
  );
  check(
    "returns room_types array",
    Array.isArray(availability.body?.data?.room_types) &&
      availability.body.data.room_types.length > 0
  );
  const matchedType = (availability.body?.data?.room_types || []).find(
    (rt) => rt.room_type_id === withRooms.room_type_id
  );
  check(
    "includes inventory counts for fixture room type",
    matchedType &&
      typeof matchedType.available_rooms === "number" &&
      typeof matchedType.is_available === "boolean"
  );
  check(
    "includes indicative pricing fields",
    matchedType &&
      "subtotal" in matchedType &&
      "tax_amount" in matchedType &&
      "total_amount" in matchedType &&
      "on_request" in matchedType
  );

  const availabilityMissing = await api(
    "GET",
    `/api/bookings/availability?check_in_date=${checkIn}&check_out_date=${checkOut}`
  );
  check(
    "requires hotel_id or hotel_slug",
    availabilityMissing.status === 400
  );

  const availabilityPast = await api(
    "GET",
    `/api/bookings/availability?hotel_slug=${encodeURIComponent(
      withRooms.hotel_slug
    )}&check_in_date=2020-01-01&check_out_date=2020-01-03`
  );
  check("rejects past check-in", availabilityPast.status === 400);

  // -------------------------------------------------------------------------
  section("Public POST /api/bookings — validation");
  const badDates = await api("POST", "/api/bookings", {
    body: {
      hotel_id: withRooms.hotel_id,
      room_type_id: withRooms.room_type_id,
      ...guest(),
      check_in_date: checkOut,
      check_out_date: checkIn,
    },
  });
  check("rejects check_out before check_in", badDates.status === 400, `got ${badDates.status}`);
  check(
    "explains the date error",
    JSON.stringify(badDates.body?.errors || []).includes("check_out_date must be after")
  );

  const pastDate = await api("POST", "/api/bookings", {
    body: {
      hotel_id: withRooms.hotel_id,
      room_type_id: withRooms.room_type_id,
      ...guest(),
      check_in_date: isoDaysFromNow(-5),
      check_out_date: isoDaysFromNow(-3),
    },
  });
  check("rejects past arrival dates", pastDate.status === 400, `got ${pastDate.status}`);

  const badEmail = await api("POST", "/api/bookings", {
    body: {
      hotel_id: withRooms.hotel_id,
      room_type_id: withRooms.room_type_id,
      ...guest({ guest_email: "not-an-email" }),
      check_in_date: checkIn,
      check_out_date: checkOut,
    },
  });
  check("rejects malformed email", badEmail.status === 400, `got ${badEmail.status}`);

  const badPhone = await api("POST", "/api/bookings", {
    body: {
      hotel_id: withRooms.hotel_id,
      room_type_id: withRooms.room_type_id,
      ...guest({ guest_phone: "12" }),
      check_in_date: checkIn,
      check_out_date: checkOut,
    },
  });
  check("rejects too-short phone", badPhone.status === 400, `got ${badPhone.status}`);

  const intlPhone = track(
    await api("POST", "/api/bookings", {
      body: {
        hotel_id: withRooms.hotel_id,
        room_type_id: withRooms.room_type_id,
        ...guest({ guest_phone: "+1 (415) 555-0123" }),
        check_in_date: isoDaysFromNow(200),
        check_out_date: isoDaysFromNow(201),
      },
    })
  );
  check("accepts international phone format", intlPhone.status === 201, `got ${intlPhone.status}`);

  const zeroAdults = await api("POST", "/api/bookings", {
    body: {
      hotel_id: withRooms.hotel_id,
      room_type_id: withRooms.room_type_id,
      ...guest(),
      check_in_date: checkIn,
      check_out_date: checkOut,
      adults: 0,
    },
  });
  check("rejects adults = 0", zeroAdults.status === 400, `got ${zeroAdults.status}`);

  // -------------------------------------------------------------------------
  section("Public POST /api/bookings — relationship + inventory");
  if (other) {
    const mismatch = await api("POST", "/api/bookings", {
      body: {
        hotel_id: other.hotel_id,
        room_type_id: withRooms.room_type_id,
        ...guest(),
        check_in_date: checkIn,
        check_out_date: checkOut,
      },
    });
    check(
      "rejects room type from a different hotel",
      mismatch.status === 400,
      `got ${mismatch.status}: ${mismatch.body?.message}`
    );
  } else {
    console.log("  SKIP  cross-hotel check (only one hotel seeded)");
  }

  const missingHotel = await api("POST", "/api/bookings", {
    body: {
      hotel_id: "00000000-0000-4000-8000-000000000000",
      room_type_id: withRooms.room_type_id,
      ...guest(),
      check_in_date: checkIn,
      check_out_date: checkOut,
    },
  });
  check("404s an unknown hotel", missingHotel.status === 404, `got ${missingHotel.status}`);

  const overbook = await api("POST", "/api/bookings", {
    body: {
      hotel_id: withRooms.hotel_id,
      room_type_id: withRooms.room_type_id,
      ...guest(),
      check_in_date: checkIn,
      check_out_date: checkOut,
      number_of_rooms: withRooms.room_count + 5,
    },
  });
  track(overbook);
  check(
    "blocks requests beyond inventory (409)",
    overbook.status === 409,
    `got ${overbook.status}: ${overbook.body?.message}`
  );

  // Non-overlapping dates must remain bookable even when the range is full.
  const adjacent = track(
    await api("POST", "/api/bookings", {
      body: {
        hotel_id: withRooms.hotel_id,
        room_type_id: withRooms.room_type_id,
        ...guest(),
        check_in_date: checkOut,
        check_out_date: isoDaysFromNow(33),
        number_of_rooms: 1,
      },
    })
  );
  check(
    "allows a booking starting on the previous checkout day",
    adjacent.status === 201,
    `got ${adjacent.status}: ${adjacent.body?.message}`
  );

  // Fill the room type completely, then prove the next request is refused.
  const fillers = [];
  for (let i = 0; i < withRooms.room_count; i += 1) {
    const filler = track(
      await api("POST", "/api/bookings", {
        body: {
          hotel_id: withRooms.hotel_id,
          room_type_id: withRooms.room_type_id,
          ...guest(),
          check_in_date: isoDaysFromNow(120),
          check_out_date: isoDaysFromNow(122),
          number_of_rooms: 1,
        },
      })
    );
    fillers.push(filler.status);
  }
  check(
    `fills all ${withRooms.room_count} room(s) for a clear window`,
    fillers.every((status) => status === 201),
    fillers.join(",")
  );

  const soldOut = track(
    await api("POST", "/api/bookings", {
      body: {
        hotel_id: withRooms.hotel_id,
        room_type_id: withRooms.room_type_id,
        ...guest(),
        check_in_date: isoDaysFromNow(120),
        check_out_date: isoDaysFromNow(122),
        number_of_rooms: 1,
      },
    })
  );
  check(
    "refuses the sold-out night (409)",
    soldOut.status === 409,
    `got ${soldOut.status}: ${soldOut.body?.message}`
  );

  const concurrent = await Promise.all(
    Array.from({ length: 4 }, () =>
      api("POST", "/api/bookings", {
        body: {
          hotel_id: withRooms.hotel_id,
          room_type_id: withRooms.room_type_id,
          ...guest(),
          check_in_date: isoDaysFromNow(150),
          check_out_date: isoDaysFromNow(151),
          number_of_rooms: withRooms.room_count,
        },
      })
    )
  );
  concurrent.forEach(track);
  const accepted = concurrent.filter((r) => r.status === 201).length;
  check(
    "concurrent full-inventory requests: exactly one wins",
    accepted === 1,
    `${accepted} accepted of 4`
  );

  // -------------------------------------------------------------------------
  section("Public GET /api/bookings/:bookingNumber");
  const noVerify = await api("GET", `/api/bookings/${bookingNumber}`);
  check("requires email or phone", noVerify.status === 400, `got ${noVerify.status}`);

  const wrongEmail = await api(
    "GET",
    `/api/bookings/${bookingNumber}?email=someone-else@example.com`
  );
  check("rejects a non-matching email", wrongEmail.status === 404, `got ${wrongEmail.status}`);

  const unknownRef = await api(
    "GET",
    `/api/bookings/M2N-19990101-ZZZZZ?email=selftest@${TEST_EMAIL_DOMAIN}`
  );
  check("unknown reference and failed verification are indistinguishable",
    unknownRef.status === 404 && unknownRef.body?.message === wrongEmail.body?.message);

  const byEmail = await api(
    "GET",
    `/api/bookings/${bookingNumber}?email=selftest@${TEST_EMAIL_DOMAIN}`
  );
  check("returns the booking for the right email", byEmail.status === 200, `got ${byEmail.status}`);
  check(
    "never leaks contact details or internal ids",
    byEmail.body?.data &&
      !("guest_email" in byEmail.body.data) &&
      !("guest_phone" in byEmail.body.data) &&
      !("id" in byEmail.body.data)
  );

  const byPhone = await api(
    "GET",
    `/api/bookings/${bookingNumber}?phone=9876543210`
  );
  check(
    "matches phone without the country code",
    byPhone.status === 200,
    `got ${byPhone.status}`
  );

  // -------------------------------------------------------------------------
  section("Admin auth");
  const noToken = await api("GET", "/api/admin/bookings");
  check("rejects unauthenticated access", noToken.status === 401, `got ${noToken.status}`);

  const badToken = await api("GET", "/api/admin/bookings", { token: "not-a-jwt" });
  check("rejects a bogus token", badToken.status === 401, `got ${badToken.status}`);

  // -------------------------------------------------------------------------
  section("Admin GET /api/admin/bookings");
  const list = await api("GET", "/api/admin/bookings?limit=5", { token });
  check("lists bookings", list.status === 200, `got ${list.status}`);
  check("returns pagination metadata", typeof list.body?.total === "number" && list.body?.limit === 5);
  check("honours the limit", (list.body?.data || []).length <= 5);

  const sorted = await api(
    "GET",
    "/api/admin/bookings?sort=check_in_date&order=asc&limit=5",
    { token }
  );
  check(
    "accepts sort + order",
    sorted.status === 200 && sorted.body?.sort === "check_in_date",
    `got ${sorted.status} sort=${sorted.body?.sort}`
  );
  check("echoes order", sorted.body?.order === "asc");

  const stats = await api("GET", "/api/admin/bookings/stats", { token });
  check("returns booking stats", stats.status === 200, `got ${stats.status}`);
  check(
    "stats include arrivals and by_status",
    typeof stats.body?.data?.arrivals_today === "number" &&
      stats.body?.data?.by_status &&
      typeof stats.body.data.by_status.pending === "number"
  );
  check(
    "stats include occupancy summary",
    stats.body?.data?.occupancy &&
      typeof stats.body.data.occupancy.sellable_rooms === "number"
  );

  const filtered = await api(
    "GET",
    `/api/admin/bookings?hotel_id=${withRooms.hotel_id}&booking_status=pending`,
    { token }
  );
  check("filters by hotel and status", filtered.status === 200, `got ${filtered.status}`);
  check(
    "filter results all match",
    (filtered.body?.data || []).every(
      (b) => b.hotel_id === withRooms.hotel_id && b.booking_status === "pending"
    )
  );

  const searched = await api(
    "GET",
    `/api/admin/bookings?search=${encodeURIComponent(bookingNumber)}`,
    { token }
  );
  check(
    "searches by booking number",
    searched.status === 200 && (searched.body?.data || []).length === 1,
    `got ${searched.status} / ${(searched.body?.data || []).length} rows`
  );

  const byDate = await api(
    "GET",
    `/api/admin/bookings?check_in_from=${checkIn}&check_in_to=${checkIn}`,
    { token }
  );
  check("filters by check-in window", byDate.status === 200, `got ${byDate.status}`);
  check(
    "date filter results all match",
    (byDate.body?.data || []).every(
      (b) => String(b.check_in_date).slice(0, 10) === checkIn
    )
  );

  const badFilter = await api("GET", "/api/admin/bookings?check_in_from=2026-13-45", { token });
  check("rejects a malformed date filter", badFilter.status === 400, `got ${badFilter.status}`);

  const adminId = searched.body?.data?.[0]?.id;

  // -------------------------------------------------------------------------
  section("Admin GET /api/admin/bookings/:id");
  const detail = await api("GET", `/api/admin/bookings/${adminId}`, { token });
  check("fetches one booking", detail.status === 200, `got ${detail.status}`);
  check("includes joined hotel and room type names",
    Boolean(detail.body?.data?.hotel_name && detail.body?.data?.room_type_name));

  const missing = await api(
    "GET",
    "/api/admin/bookings/00000000-0000-4000-8000-000000000000",
    { token }
  );
  check("404s an unknown id", missing.status === 404, `got ${missing.status}`);

  const badId = await api("GET", "/api/admin/bookings/not-a-uuid", { token });
  check("404s a malformed id without a SQL error", badId.status === 404, `got ${badId.status}`);

  // -------------------------------------------------------------------------
  section("Admin PATCH /api/admin/bookings/:id/status");
  const badJump = await api("PATCH", `/api/admin/bookings/${adminId}/status`, {
    token,
    body: { booking_status: "checked_out" },
  });
  check(
    "blocks an illegal transition (pending → checked_out)",
    badJump.status === 400,
    `got ${badJump.status}`
  );

  const confirm = await api("PATCH", `/api/admin/bookings/${adminId}/status`, {
    token,
    body: { booking_status: "confirmed", payment_status: "partial" },
  });
  check("confirms the booking", confirm.status === 200, `got ${confirm.status}`);
  check("stamps confirmed_at", Boolean(confirm.body?.data?.confirmed_at));
  check("updates payment status", confirm.body?.data?.payment_status === "partial");

  const checkIn2 = await api("PATCH", `/api/admin/bookings/${adminId}/status`, {
    token,
    body: { booking_status: "checked_in" },
  });
  check("allows confirmed → checked_in", checkIn2.status === 200, `got ${checkIn2.status}`);

  const badStatus = await api("PATCH", `/api/admin/bookings/${adminId}/status`, {
    token,
    body: { booking_status: "teleported" },
  });
  check("rejects an unknown status value", badStatus.status === 400, `got ${badStatus.status}`);

  // -------------------------------------------------------------------------
  section("Admin PATCH /api/admin/bookings/:id/assign-room");
  const roomRow = await query(
    `SELECT id, room_number FROM rooms
     WHERE room_type_id = $1 AND status IN ('available','occupied')
     ORDER BY room_number LIMIT 1`,
    [withRooms.room_type_id]
  );
  const roomId = roomRow.rows[0]?.id;

  const assign = await api("PATCH", `/api/admin/bookings/${adminId}/assign-room`, {
    token,
    body: { room_id: roomId },
  });
  check("assigns a room", assign.status === 200, `got ${assign.status}: ${assign.body?.message}`);
  check("returns the room number", Boolean(assign.body?.data?.room_number));

  const otherRoomType = await query(
    `SELECT r.id FROM rooms r WHERE r.room_type_id <> $1 LIMIT 1`,
    [withRooms.room_type_id]
  );
  if (otherRoomType.rows[0]) {
    const wrongRoom = await api("PATCH", `/api/admin/bookings/${adminId}/assign-room`, {
      token,
      body: { room_id: otherRoomType.rows[0].id },
    });
    check(
      "refuses a room from another room type",
      wrongRoom.status === 400,
      `got ${wrongRoom.status}: ${wrongRoom.body?.message}`
    );
  }

  const unassign = await api("PATCH", `/api/admin/bookings/${adminId}/assign-room`, {
    token,
    body: { room_id: null },
  });
  check("unassigns the room", unassign.status === 200 && !unassign.body?.data?.room_id);

  // -------------------------------------------------------------------------
  section("Admin PATCH /api/admin/bookings/:id");
  const edit = await api("PATCH", `/api/admin/bookings/${adminId}`, {
    token,
    body: { guest_name: "Selftest Guest Renamed", subtotal: 5000, tax_amount: 250, total_amount: 5250 },
  });
  check("updates guest and amounts", edit.status === 200, `got ${edit.status}`);
  check("persists the new name", edit.body?.data?.guest_name === "Selftest Guest Renamed");
  check("persists amounts", Number(edit.body?.data?.total_amount) === 5250);

  const overbookEdit = await api("PATCH", `/api/admin/bookings/${adminId}`, {
    token,
    body: { number_of_rooms: withRooms.room_count + 10 },
  });
  check(
    "re-checks inventory when the room count grows",
    overbookEdit.status === 409,
    `got ${overbookEdit.status}`
  );

  const emptyEdit = await api("PATCH", `/api/admin/bookings/${adminId}`, { token, body: {} });
  check("rejects an empty update", emptyEdit.status === 400, `got ${emptyEdit.status}`);

  const cancel = await api("PATCH", `/api/admin/bookings/${adminId}/status`, {
    token,
    body: { booking_status: "cancelled", cancellation_reason: "Self-test cleanup" },
  });
  check("cancels from checked_in", cancel.status === 200, `got ${cancel.status}`);
  check("stamps cancelled_at + reason",
    Boolean(cancel.body?.data?.cancelled_at) &&
      cancel.body?.data?.cancellation_reason === "Self-test cleanup");

  const afterCancel = await api("PATCH", `/api/admin/bookings/${adminId}/status`, {
    token,
    body: { booking_status: "confirmed" },
  });
  check("cancelled bookings are terminal", afterCancel.status === 400, `got ${afterCancel.status}`);

  // A cancelled reservation must release its inventory.
  const reclaim = track(
    await api("POST", "/api/bookings", {
      body: {
        hotel_id: withRooms.hotel_id,
        room_type_id: withRooms.room_type_id,
        ...guest(),
        check_in_date: checkIn,
        check_out_date: checkOut,
        number_of_rooms: 1,
      },
    })
  );
  check(
    "cancelling frees the room for the same dates",
    reclaim.status === 201,
    `got ${reclaim.status}: ${reclaim.body?.message}`
  );

  // -------------------------------------------------------------------------
  section("Regression — existing modules still respond");
  for (const path of [
    "/health",
    "/api/hotels",
    "/api/hotels/hotel-zaarang-inn",
    "/api/rooms/types",
    "/api/tariffs?hotel_slug=hotel-zaarang-inn",
  ]) {
    const result = await api("GET", path);
    check(`GET ${path}`, result.status === 200, `got ${result.status}`);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`\nFAILED: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch((error) =>
      console.error(`Cleanup failed: ${error.message}`)
    );
    await pool.end();
  });
