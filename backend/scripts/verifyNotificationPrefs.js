/**
 * Phase 11 notification preferences verification.
 * Migration 007 column, create defaults, guest/admin updates, email gate helper.
 *
 * Usage: node scripts/verifyNotificationPrefs.js  (server on :5001)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");
const { signAdminToken } = require("../utils/adminAuth");
const {
  DEFAULT_NOTIFICATION_PREFERENCES,
  normalizeNotificationPreferences,
  parseNotificationPreferences,
  wantsEmailUpdates,
} = require("../utils/notificationPreferences");
const {
  deliverBookingEmail,
} = require("../services/bookingNotification.service");

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

function prefsEqual(a, b) {
  const left = normalizeNotificationPreferences(a);
  const right = normalizeNotificationPreferences(b);
  return (
    left.email_updates === right.email_updates &&
    left.sms_opt_in === right.sms_opt_in &&
    left.whatsapp_opt_in === right.whatsapp_opt_in
  );
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

  section("Migration 007 / column");
  const col = await query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_name = 'bookings' AND column_name = 'notification_preferences'`
  );
  check("notification_preferences column exists", col.rows.length === 1);
  check("column is jsonb", col.rows[0]?.data_type === "jsonb");
  check("column is NOT NULL", col.rows[0]?.is_nullable === "NO");

  const mig = await query(
    `SELECT filename FROM schema_migrations
     WHERE filename = '007_booking_notification_preferences.sql'`
  );
  check("007 recorded in schema_migrations", mig.rows.length === 1);

  section("Helper normalize / validate / gate");
  check(
    "default shape",
    prefsEqual(normalizeNotificationPreferences(null), DEFAULT_NOTIFICATION_PREFERENCES)
  );
  const badKey = parseNotificationPreferences({ email_updates: true, marketing: true });
  check("rejects unknown keys", !badKey.ok);
  const partial = parseNotificationPreferences(
    { sms_opt_in: true },
    { partial: true, base: { email_updates: false, sms_opt_in: false, whatsapp_opt_in: false } }
  );
  check(
    "partial merge",
    partial.ok &&
      partial.value.email_updates === false &&
      partial.value.sms_opt_in === true
  );
  check("wantsEmailUpdates true default", wantsEmailUpdates(undefined) === true);
  check(
    "wantsEmailUpdates false",
    wantsEmailUpdates({ email_updates: false }) === false
  );

  if (typeof deliverBookingEmail === "function") {
    const skipped = await deliverBookingEmail(
      "booking_status_update",
      {
        guest_email: "prefs-gate@booking-selftest.invalid",
        booking_number: "GATE-TEST",
        notification_preferences: { email_updates: false },
      },
      () => ({ subject: "x", html: "x", text: "x" })
    );
    check(
      "status update skipped when email_updates false",
      skipped?.skipped === true && skipped?.reason === "email_updates_disabled"
    );

    const confirmSkipped = await deliverBookingEmail(
      "booking_confirmation",
      {
        guest_email: "prefs-gate@booking-selftest.invalid",
        booking_number: "GATE-TEST",
        notification_preferences: { email_updates: false },
      },
      () => ({ subject: "x", html: "x", text: "x" })
    );
    check(
      "confirmation not gated by email_updates",
      !(
        confirmSkipped?.skipped === true &&
        confirmSkipped?.reason === "email_updates_disabled"
      )
    );
  } else {
    check("deliverBookingEmail exported for gate test", false);
  }

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

  const token = signAdminToken(admin);
  const email = "phase11-prefs@booking-selftest.invalid";
  const phone = "+91 98765 00211";
  const checkIn = isoDaysFromNow(170);
  const checkOut = isoDaysFromNow(172);

  section("Create with custom prefs (admin)");
  const created = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Prefs Verify Guest",
      guest_email: email,
      guest_phone: phone,
      check_in_date: checkIn,
      check_out_date: checkOut,
      adults: 2,
      children: 0,
      number_of_rooms: 1,
      booking_source: "admin",
      booking_status: "confirmed",
      payment_status: "unpaid",
      notification_preferences: {
        email_updates: false,
        sms_opt_in: true,
        whatsapp_opt_in: false,
      },
    },
  });
  check("admin create 201", created.status === 201, `status=${created.status}`);
  const booking = created.body?.data;
  if (booking?.booking_number) createdBookingNumbers.push(booking.booking_number);
  check(
    "create returns prefs",
    prefsEqual(booking?.notification_preferences, {
      email_updates: false,
      sms_opt_in: true,
      whatsapp_opt_in: false,
    }),
    JSON.stringify(booking?.notification_preferences)
  );

  section("Public lookup includes prefs");
  const lookup = await api(
    "GET",
    `/api/bookings/${encodeURIComponent(booking.booking_number)}?email=${encodeURIComponent(email)}`
  );
  check("lookup 200", lookup.status === 200);
  check(
    "lookup prefs match",
    prefsEqual(lookup.body?.data?.notification_preferences, {
      email_updates: false,
      sms_opt_in: true,
      whatsapp_opt_in: false,
    })
  );

  section("Guest preference update (contact-verified)");
  const guestUpdate = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(booking.booking_number)}/notification-preferences`,
    {
      body: {
        email,
        notification_preferences: {
          email_updates: true,
          whatsapp_opt_in: true,
        },
      },
    }
  );
  check("guest update 200", guestUpdate.status === 200);
  check(
    "guest partial merge keeps sms_opt_in",
    prefsEqual(guestUpdate.body?.data?.notification_preferences, {
      email_updates: true,
      sms_opt_in: true,
      whatsapp_opt_in: true,
    }),
    JSON.stringify(guestUpdate.body?.data?.notification_preferences)
  );

  const badContact = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(booking.booking_number)}/notification-preferences`,
    {
      body: {
        email: "wrong@booking-selftest.invalid",
        notification_preferences: { email_updates: false },
      },
    }
  );
  check("wrong contact 404", badContact.status === 404);

  section("Admin PATCH prefs");
  const adminPatch = await api("PATCH", `/api/admin/bookings/${booking.id}`, {
    token,
    body: {
      notification_preferences: {
        email_updates: false,
        sms_opt_in: false,
        whatsapp_opt_in: false,
      },
    },
  });
  check("admin patch 200", adminPatch.status === 200);
  check(
    "admin patch prefs",
    prefsEqual(adminPatch.body?.data?.notification_preferences, {
      email_updates: false,
      sms_opt_in: false,
      whatsapp_opt_in: false,
    })
  );

  section("Public create optional prefs");
  const publicCreate = await api("POST", "/api/bookings", {
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Prefs Public Guest",
      guest_email: "phase11-prefs-public@booking-selftest.invalid",
      guest_phone: "+91 98765 00212",
      check_in_date: isoDaysFromNow(175),
      check_out_date: isoDaysFromNow(177),
      adults: 1,
      children: 0,
      number_of_rooms: 1,
      notification_preferences: {
        email_updates: false,
        sms_opt_in: false,
        whatsapp_opt_in: true,
      },
    },
  });
  check(
    "public create 201",
    publicCreate.status === 201,
    `status=${publicCreate.status} msg=${publicCreate.body?.message || ""}`
  );
  const publicBooking = publicCreate.body?.data;
  if (publicBooking?.booking_number) {
    createdBookingNumbers.push(publicBooking.booking_number);
  }
  check(
    "public create prefs",
    prefsEqual(publicBooking?.notification_preferences, {
      email_updates: false,
      sms_opt_in: false,
      whatsapp_opt_in: true,
    }),
    JSON.stringify(publicBooking?.notification_preferences)
  );

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("\nVerification crashed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (error) {
      console.error("Cleanup failed:", error.message);
    }
    await pool.end();
  });
