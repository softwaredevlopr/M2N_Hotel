/**
 * Phase 11 guest self-service stay modification verification.
 * Contact verify, preview, modify, pricing, self-exclusion, ineligible statuses.
 *
 * Usage: node scripts/verifyGuestStayModify.js  (server on :5001)
 * No schema changes.
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
  const email = "phase11-guest-modify@booking-selftest.invalid";
  const phone = "+91 98765 00210";
  const baseIn = isoDaysFromNow(160);
  const baseOut = isoDaysFromNow(162);

  section("Create guest-modifiable booking");
  const created = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase11 Guest Modify",
      guest_email: email,
      guest_phone: phone,
      check_in_date: baseIn,
      check_out_date: baseOut,
      adults: 2,
      number_of_rooms: 1,
      booking_status: "confirmed",
      admin_notes: "Guest modify verify — private",
    },
  });
  if (created.body?.data?.booking_number) {
    createdBookingNumbers.push(created.body.data.booking_number);
  }
  check("create 201", created.status === 201);
  const bookingNumber = created.body?.data?.booking_number;
  const bookingId = created.body?.data?.id;
  check("booking number present", Boolean(bookingNumber));

  section("Contact verification");
  const wrong = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(bookingNumber)}/modify/preview`,
    {
      body: {
        email: "wrong@example.com",
        check_in_date: baseIn,
        check_out_date: isoDaysFromNow(163),
      },
    }
  );
  check("wrong contact preview 404", wrong.status === 404);

  const missing = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(bookingNumber)}/modify`,
    {
      body: {
        check_in_date: baseIn,
        check_out_date: isoDaysFromNow(163),
      },
    }
  );
  check("missing contact modify 400", missing.status === 400);

  section("Preview");
  const newOut = isoDaysFromNow(164);
  const preview = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(bookingNumber)}/modify/preview`,
    {
      body: {
        email,
        check_in_date: baseIn,
        check_out_date: newOut,
      },
    }
  );
  check("preview 200", preview.status === 200, `got ${preview.status}`);
  check("preview is_available", preview.body?.data?.is_available === true);
  const expected = bookingService.buildIndicativeAmounts(
    fixture.base_price,
    nightsBetween(baseIn, newOut),
    1
  );
  check(
    "preview amounts match base_price rules",
    Number(preview.body?.data?.total_amount) === expected.total_amount
  );
  check(
    "preview omits admin_notes",
    preview.body?.data &&
      !Object.prototype.hasOwnProperty.call(preview.body.data, "admin_notes")
  );

  section("Successful date modification");
  const modified = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(bookingNumber)}/modify`,
    {
      body: {
        email,
        check_in_date: baseIn,
        check_out_date: newOut,
      },
    }
  );
  check("modify 200", modified.status === 200, `got ${modified.status}`);
  check(
    "dates updated",
    modified.body?.data?.check_in_date === baseIn &&
      modified.body?.data?.check_out_date === newOut
  );
  check(
    "pricing recalculated",
    Number(modified.body?.data?.total_amount) === expected.total_amount
  );
  check(
    "response omits guest_email",
    modified.body?.data &&
      !Object.prototype.hasOwnProperty.call(modified.body.data, "guest_email")
  );
  check(
    "response omits admin_notes",
    modified.body?.data &&
      !Object.prototype.hasOwnProperty.call(modified.body.data, "admin_notes")
  );

  const adminDetail = await api("GET", `/api/admin/bookings/${bookingId}`, {
    token,
  });
  check(
    "admin_notes preserved after guest modify",
    adminDetail.body?.data?.admin_notes === "Guest modify verify — private"
  );

  section("Room-type modification");
  if (altType) {
    const typeMod = await api(
      "POST",
      `/api/bookings/${encodeURIComponent(bookingNumber)}/modify`,
      {
        body: {
          phone,
          room_type_id: altType.room_type_id,
        },
      }
    );
    check("room type modify 200", typeMod.status === 200, `got ${typeMod.status}`);
    const typeAmounts = bookingService.buildIndicativeAmounts(
      altType.base_price,
      nightsBetween(
        typeMod.body?.data?.check_in_date,
        typeMod.body?.data?.check_out_date
      ),
      1
    );
    check(
      "room type pricing recalculated",
      Number(typeMod.body?.data?.total_amount) === typeAmounts.total_amount
    );
    check(
      "room type name updated",
      typeMod.body?.data?.room_type_name === altType.name
    );

    await api("POST", `/api/bookings/${encodeURIComponent(bookingNumber)}/modify`, {
      body: { email, room_type_id: fixture.room_type_id },
    });
  }

  section("Invalid dates");
  const sameDay = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(bookingNumber)}/modify`,
    {
      body: {
        email,
        check_in_date: isoDaysFromNow(170),
        check_out_date: isoDaysFromNow(170),
      },
    }
  );
  check("same-day rejected", sameDay.status === 400);

  const past = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(bookingNumber)}/modify`,
    {
      body: {
        email,
        check_in_date: isoDaysFromNow(-2),
        check_out_date: isoDaysFromNow(-1),
      },
    }
  );
  check("past check-in rejected", past.status === 400);

  section("Self-exclusion + overbook");
  const sellable = Number(fixture.sellable) || 0;
  check("sellable rooms", sellable >= 1, `sellable=${sellable}`);
  const tightIn = isoDaysFromNow(180);
  const tightOut = isoDaysFromNow(182);

  const move = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(bookingNumber)}/modify`,
    {
      body: {
        email,
        check_in_date: tightIn,
        check_out_date: tightOut,
        room_type_id: fixture.room_type_id,
        number_of_rooms: 1,
      },
    }
  );
  check("move onto tight window", move.status === 200);

  for (let i = 0; i < Math.max(sellable - 1, 0); i += 1) {
    const fill = await api("POST", "/api/admin/bookings", {
      token,
      body: {
        hotel_id: fixture.hotel_id,
        room_type_id: fixture.room_type_id,
        guest_name: `GuestMod Filler ${i}`,
        guest_email: `guestmod-filler-${i}@booking-selftest.invalid`,
        guest_phone: `+91 98765 00${220 + i}`,
        check_in_date: tightIn,
        check_out_date: tightOut,
        booking_status: "confirmed",
      },
    });
    if (fill.body?.data?.booking_number) {
      createdBookingNumbers.push(fill.body.data.booking_number);
    }
    check(`filler ${i}`, fill.status === 201);
  }

  const extend = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(bookingNumber)}/modify`,
    {
      body: {
        email,
        check_in_date: tightIn,
        check_out_date: isoDaysFromNow(183),
      },
    }
  );
  check(
    "self-exclusion allows extend",
    extend.status === 200,
    `got ${extend.status}: ${extend.body?.message || ""}`
  );

  const over = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(bookingNumber)}/modify`,
    {
      body: {
        email,
        number_of_rooms: sellable + 5,
      },
    }
  );
  check("over-capacity rejected", over.status === 409, `got ${over.status}`);

  section("Ineligible statuses");
  const checkedIn = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "GuestMod CheckedIn",
      guest_email: "guestmod-checkedin@booking-selftest.invalid",
      guest_phone: "+91 98765 00299",
      check_in_date: isoDaysFromNow(190),
      check_out_date: isoDaysFromNow(191),
      booking_status: "confirmed",
    },
  });
  if (checkedIn.body?.data?.booking_number) {
    createdBookingNumbers.push(checkedIn.body.data.booking_number);
  }
  await api("PATCH", `/api/admin/bookings/${checkedIn.body?.data?.id}/status`, {
    token,
    body: { booking_status: "checked_in" },
  });
  const checkedInMod = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(
      checkedIn.body?.data?.booking_number
    )}/modify`,
    {
      body: {
        email: "guestmod-checkedin@booking-selftest.invalid",
        check_out_date: isoDaysFromNow(192),
      },
    }
  );
  check("checked_in guest modify rejected", checkedInMod.status === 400);

  const cancelled = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "GuestMod Cancelled",
      guest_email: "guestmod-cancelled@booking-selftest.invalid",
      guest_phone: "+91 98765 00298",
      check_in_date: isoDaysFromNow(200),
      check_out_date: isoDaysFromNow(201),
      booking_status: "confirmed",
    },
  });
  if (cancelled.body?.data?.booking_number) {
    createdBookingNumbers.push(cancelled.body.data.booking_number);
  }
  await api(
    "POST",
    `/api/bookings/${encodeURIComponent(
      cancelled.body?.data?.booking_number
    )}/cancel`,
    {
      body: { email: "guestmod-cancelled@booking-selftest.invalid" },
    }
  );
  const cancelledMod = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(
      cancelled.body?.data?.booking_number
    )}/modify`,
    {
      body: {
        email: "guestmod-cancelled@booking-selftest.invalid",
        check_out_date: isoDaysFromNow(202),
      },
    }
  );
  check("cancelled guest modify rejected", cancelledMod.status === 400);

  section("Regression — guest cancel still works");
  const cancelTarget = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "GuestMod Cancel Still",
      guest_email: "guestmod-cancel-still@booking-selftest.invalid",
      guest_phone: "+91 98765 00297",
      check_in_date: isoDaysFromNow(210),
      check_out_date: isoDaysFromNow(211),
      booking_status: "pending",
    },
  });
  if (cancelTarget.body?.data?.booking_number) {
    createdBookingNumbers.push(cancelTarget.body.data.booking_number);
  }
  const stillCancel = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(
      cancelTarget.body?.data?.booking_number
    )}/cancel`,
    {
      body: { email: "guestmod-cancel-still@booking-selftest.invalid" },
    }
  );
  check("guest cancel still 200", stillCancel.status === 200);
  check(
    "guest cancel status cancelled",
    stillCancel.body?.data?.booking_status === "cancelled"
  );

  section("Regression — admin stay modify still works");
  const adminStay = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "GuestMod Admin Stay",
      guest_email: "guestmod-admin-stay@booking-selftest.invalid",
      guest_phone: "+91 98765 00296",
      check_in_date: isoDaysFromNow(220),
      check_out_date: isoDaysFromNow(221),
      booking_status: "confirmed",
    },
  });
  if (adminStay.body?.data?.booking_number) {
    createdBookingNumbers.push(adminStay.body.data.booking_number);
  }
  const adminPatch = await api(
    "PATCH",
    `/api/admin/bookings/${adminStay.body?.data?.id}`,
    {
      token,
      body: { check_out_date: isoDaysFromNow(223) },
    }
  );
  check("admin stay patch 200", adminPatch.status === 200);
  check(
    "admin stay dates updated",
    adminPatch.body?.data?.check_out_date === isoDaysFromNow(223)
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
