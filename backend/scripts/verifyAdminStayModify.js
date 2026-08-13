/**
 * Phase 11 admin stay modification verification.
 * Covers transactional PATCH stay updates: dates, room type, inventory
 * exclude-self, pricing recalculation, invalid dates, terminal status reject.
 *
 * Usage: node scripts/verifyAdminStayModify.js  (server must be running on :5001)
 * Does not change schema.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");
const { signAdminToken } = require("../utils/adminAuth");
const bookingService = require("../services/booking.service");

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

function nightsBetween(checkIn, checkOut) {
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86400000);
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
  check(
    "backend health",
    health.status === 200 && health.body?.status === "healthy"
  );

  const adminResult = await query(
    `SELECT id, email, role FROM admin_users WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1`
  );
  const admin = adminResult.rows[0];
  check("active admin exists", Boolean(admin));
  if (!admin) throw new Error("No admin — run npm run seed:admin");

  const types = await query(
    `SELECT rt.id AS room_type_id, rt.hotel_id, rt.base_price, rt.name,
            (
              SELECT COUNT(*)::int FROM rooms r
              WHERE r.room_type_id = rt.id
                AND r.status IN ('available', 'occupied')
            ) AS sellable
     FROM room_types rt
     INNER JOIN hotels h ON h.id = rt.hotel_id
     WHERE rt.status = 'active' AND h.status = 'active'
     ORDER BY sellable DESC, rt.created_at ASC`
  );
  const fixture = types.rows[0];
  check("active hotel/room type fixture", Boolean(fixture));
  if (!fixture) throw new Error("No fixture room type");

  const altType = types.rows.find(
    (row) =>
      row.hotel_id === fixture.hotel_id &&
      row.room_type_id !== fixture.room_type_id
  );
  check("same-hotel alternate room type", Boolean(altType));

  const token = signAdminToken(admin);
  const baseIn = isoDaysFromNow(110);
  const baseOut = isoDaysFromNow(112);

  section("Create stay-modify fixture");
  const created = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase11 Stay Modify",
      guest_email: "phase11-stay@booking-selftest.invalid",
      guest_phone: "+91 98765 00110",
      check_in_date: baseIn,
      check_out_date: baseOut,
      adults: 2,
      number_of_rooms: 1,
      booking_status: "confirmed",
      admin_notes: "Stay modify verify note",
      special_requests: "Guest visible stay verify",
    },
  });
  if (created.body?.data?.booking_number) {
    createdBookingNumbers.push(created.body.data.booking_number);
  }
  check("create fixture 201", created.status === 201);
  const bookingId = created.body?.data?.id;
  check("fixture id present", Boolean(bookingId));
  check(
    "fixture keeps admin_notes",
    created.body?.data?.admin_notes === "Stay modify verify note"
  );

  section("Date modification + pricing recalculation");
  const newIn = isoDaysFromNow(113);
  const newOut = isoDaysFromNow(116);
  const datePatch = await api("PATCH", `/api/admin/bookings/${bookingId}`, {
    token,
    body: {
      check_in_date: newIn,
      check_out_date: newOut,
    },
  });
  check("date patch 200", datePatch.status === 200, `got ${datePatch.status}`);
  check(
    "dates updated",
    datePatch.body?.data?.check_in_date === newIn &&
      datePatch.body?.data?.check_out_date === newOut
  );
  const expectedNights = nightsBetween(newIn, newOut);
  const expectedAmounts = bookingService.buildIndicativeAmounts(
    fixture.base_price,
    expectedNights,
    1
  );
  check(
    "pricing recalculated for new nights",
    Number(datePatch.body?.data?.subtotal) === expectedAmounts.subtotal &&
      Number(datePatch.body?.data?.total_amount) ===
        expectedAmounts.total_amount &&
      Number(datePatch.body?.data?.tax_amount) === 0
  );
  check(
    "admin_notes preserved after date patch",
    datePatch.body?.data?.admin_notes === "Stay modify verify note"
  );
  check(
    "special_requests preserved after date patch",
    datePatch.body?.data?.special_requests === "Guest visible stay verify"
  );
  check(
    "hotel_id unchanged",
    datePatch.body?.data?.hotel_id === fixture.hotel_id
  );

  section("Room-type modification");
  if (altType) {
    const typePatch = await api("PATCH", `/api/admin/bookings/${bookingId}`, {
      token,
      body: { room_type_id: altType.room_type_id },
    });
    check(
      "room type patch 200",
      typePatch.status === 200,
      `got ${typePatch.status}`
    );
    check(
      "room_type_id updated",
      typePatch.body?.data?.room_type_id === altType.room_type_id
    );
    const typeAmounts = bookingService.buildIndicativeAmounts(
      altType.base_price,
      nightsBetween(
        typePatch.body?.data?.check_in_date,
        typePatch.body?.data?.check_out_date
      ),
      1
    );
    check(
      "pricing recalculated for new room type",
      Number(typePatch.body?.data?.subtotal) === typeAmounts.subtotal &&
        Number(typePatch.body?.data?.total_amount) === typeAmounts.total_amount
    );
    check(
      "hotel still original",
      typePatch.body?.data?.hotel_id === fixture.hotel_id
    );

    // Restore primary type for remaining capacity tests.
    await api("PATCH", `/api/admin/bookings/${bookingId}`, {
      token,
      body: { room_type_id: fixture.room_type_id },
    });
  }

  section("Invalid date rejection");
  const badDates = await api("PATCH", `/api/admin/bookings/${bookingId}`, {
    token,
    body: {
      check_in_date: isoDaysFromNow(120),
      check_out_date: isoDaysFromNow(120),
    },
  });
  check("same-day stay rejected", badDates.status === 400);

  const inverted = await api("PATCH", `/api/admin/bookings/${bookingId}`, {
    token,
    body: {
      check_in_date: isoDaysFromNow(125),
      check_out_date: isoDaysFromNow(124),
    },
  });
  check("inverted dates rejected", inverted.status === 400);

  section("Self-exclusion — modify when inventory is tight");
  const sellable = Number(fixture.sellable) || 0;
  check("fixture has sellable rooms", sellable >= 1, `sellable=${sellable}`);

  const tightIn = isoDaysFromNow(130);
  const tightOut = isoDaysFromNow(132);

  // Move subject booking onto the tight window first.
  const moveTight = await api("PATCH", `/api/admin/bookings/${bookingId}`, {
    token,
    body: {
      check_in_date: tightIn,
      check_out_date: tightOut,
      room_type_id: fixture.room_type_id,
      number_of_rooms: 1,
    },
  });
  check("move subject onto tight window", moveTight.status === 200);

  const fillers = [];
  for (let i = 0; i < Math.max(sellable - 1, 0); i += 1) {
    const fill = await api("POST", "/api/admin/bookings", {
      token,
      body: {
        hotel_id: fixture.hotel_id,
        room_type_id: fixture.room_type_id,
        guest_name: `Phase11 Filler ${i}`,
        guest_email: `phase11-filler-${i}@booking-selftest.invalid`,
        guest_phone: `+91 98765 00${200 + i}`,
        check_in_date: tightIn,
        check_out_date: tightOut,
        adults: 1,
        number_of_rooms: 1,
        booking_status: "confirmed",
      },
    });
    if (fill.body?.data?.booking_number) {
      createdBookingNumbers.push(fill.body.data.booking_number);
      fillers.push(fill.body.data.id);
    }
    check(`filler ${i} created`, fill.status === 201, `got ${fill.status}`);
  }

  // Capacity full with subject + fillers. Extending nights should still succeed
  // because excludeBookingId frees the subject's own hold during revalidation.
  const extendOut = isoDaysFromNow(133);
  const selfExclude = await api("PATCH", `/api/admin/bookings/${bookingId}`, {
    token,
    body: {
      check_in_date: tightIn,
      check_out_date: extendOut,
    },
  });
  check(
    "self-exclusion allows extend when otherwise full",
    selfExclude.status === 200,
    `got ${selfExclude.status}: ${selfExclude.body?.message || ""}`
  );

  section("Unavailable inventory rejection");
  if (sellable >= 1) {
    const overReq = await api("PATCH", `/api/admin/bookings/${bookingId}`, {
      token,
      body: {
        number_of_rooms: sellable + 5,
        check_in_date: tightIn,
        check_out_date: extendOut,
      },
    });
    check(
      "over-capacity room count rejected",
      overReq.status === 409,
      `got ${overReq.status}`
    );
  }

  section("Ineligible status rejection");
  const terminal = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase11 Terminal Stay",
      guest_email: "phase11-terminal@booking-selftest.invalid",
      guest_phone: "+91 98765 00199",
      check_in_date: isoDaysFromNow(140),
      check_out_date: isoDaysFromNow(141),
      booking_status: "confirmed",
    },
  });
  if (terminal.body?.data?.booking_number) {
    createdBookingNumbers.push(terminal.body.data.booking_number);
  }
  check("terminal fixture 201", terminal.status === 201);
  const terminalId = terminal.body?.data?.id;

  await api("PATCH", `/api/admin/bookings/${terminalId}/status`, {
    token,
    body: { booking_status: "checked_in" },
  });
  await api("PATCH", `/api/admin/bookings/${terminalId}/status`, {
    token,
    body: { booking_status: "checked_out" },
  });

  const terminalPatch = await api(
    "PATCH",
    `/api/admin/bookings/${terminalId}`,
    {
      token,
      body: {
        check_out_date: isoDaysFromNow(142),
      },
    }
  );
  check(
    "checked_out stay modify rejected",
    terminalPatch.status === 409,
    `got ${terminalPatch.status}`
  );

  const cancelled = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase11 Cancelled Stay",
      guest_email: "phase11-cancelled-stay@booking-selftest.invalid",
      guest_phone: "+91 98765 00198",
      check_in_date: isoDaysFromNow(150),
      check_out_date: isoDaysFromNow(151),
      booking_status: "confirmed",
    },
  });
  if (cancelled.body?.data?.booking_number) {
    createdBookingNumbers.push(cancelled.body.data.booking_number);
  }
  const cancelledId = cancelled.body?.data?.id;
  await api("POST", `/api/admin/bookings/${cancelledId}/cancel`, {
    token,
    body: {},
  });
  const cancelledPatch = await api(
    "PATCH",
    `/api/admin/bookings/${cancelledId}`,
    {
      token,
      body: { check_out_date: isoDaysFromNow(152) },
    }
  );
  check(
    "cancelled stay modify rejected",
    cancelledPatch.status === 409,
    `got ${cancelledPatch.status}`
  );

  section("Non-stay PATCH still works (admin_notes)");
  const notesOnly = await api("PATCH", `/api/admin/bookings/${bookingId}`, {
    token,
    body: { admin_notes: "Updated after stay modify" },
  });
  check("notes-only patch 200", notesOnly.status === 200);
  check(
    "notes-only does not require inventory path",
    notesOnly.body?.data?.admin_notes === "Updated after stay modify"
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
