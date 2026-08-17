/**
 * Phase 13 CRM Lite — hotel-scoped derived guest search + 360.
 * No schema change. Server must be running on :5001.
 *
 * Usage: node scripts/verifyCrm.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");
const { signAdminToken } = require("../utils/adminAuth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";
const EMAIL_SUFFIX = "@crm-selftest.invalid";

let passed = 0;
let failed = 0;
const createdBookingNumbers = [];
const createdInquiryIds = [];

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

function guestInList(list, email) {
  const key = `email:${String(email).trim().toLowerCase()}`;
  return (list.body?.data || []).find((row) => row.identity_key === key);
}

async function cleanupSelftestRows() {
  const inquiries = await query(
    `DELETE FROM inquiries
     WHERE guest_email ILIKE $1
        OR guest_name = 'Crm Phone Only Selftest'
     RETURNING id`,
    [`%${EMAIL_SUFFIX}`]
  );
  const bookings = await query(
    `DELETE FROM bookings WHERE guest_email ILIKE $1 RETURNING booking_number`,
    [`%${EMAIL_SUFFIX}`]
  );
  return {
    inquiries: inquiries.rows.length,
    bookings: bookings.rows.length,
  };
}

async function cleanup() {
  const removed = await cleanupSelftestRows();
  console.log(
    `Cleaned up ${removed.bookings} verification booking(s) and ${removed.inquiries} inquiry(ies).`
  );
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
    `SELECT rt.id AS room_type_id, rt.hotel_id, h.name AS hotel_name,
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
  const hotelA = types.rows[0];
  const hotelB = types.rows.find((row) => row.hotel_id !== hotelA.hotel_id);
  check("hotel A fixture", Boolean(hotelA));
  check("hotel B fixture", Boolean(hotelB));
  if (!hotelA || !hotelB) throw new Error("Need two hotels");

  const leftover = await cleanupSelftestRows();
  if (leftover.bookings || leftover.inquiries) {
    console.log(
      `Removed leftover self-test rows (${leftover.bookings} booking(s), ${leftover.inquiries} inquiry(ies)).`
    );
  }

  const token = signAdminToken(admin);
  const sharedEmail = `alpha${EMAIL_SUFFIX}`;
  const otherEmail = `beta${EMAIL_SUFFIX}`;
  const phoneTwinA = `twin-a${EMAIL_SUFFIX}`;
  const phoneTwinB = `twin-b${EMAIL_SUFFIX}`;
  const samePhone = "+91 98765 01301";

  section("Auth + validation");
  const unauth = await api(
    "GET",
    `/api/admin/guests?hotel_id=${hotelA.hotel_id}`
  );
  check("guests list requires auth", unauth.status === 401);

  const missingHotel = await api("GET", "/api/admin/guests", { token });
  check("list without hotel_id 400", missingHotel.status === 400);

  const badHotel = await api("GET", "/api/admin/guests?hotel_id=not-a-uuid", {
    token,
  });
  check("list invalid hotel_id 400", badHotel.status === 400);

  const unauthProfile = await api(
    "GET",
    `/api/admin/guests/profile?hotel_id=${hotelA.hotel_id}&key=email:${sharedEmail}`
  );
  check("profile requires auth", unauthProfile.status === 401);

  const badKey = await api(
    "GET",
    `/api/admin/guests/profile?hotel_id=${hotelA.hotel_id}&key=not-a-key`,
    { token }
  );
  check("profile invalid key 400", badKey.status === 400);

  section("Create source records");
  const bookingA1 = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "Crm Alpha One",
      guest_email: sharedEmail,
      guest_phone: "+91 98765 01310",
      check_in_date: isoDaysFromNow(50),
      check_out_date: isoDaysFromNow(52),
      booking_status: "confirmed",
    },
  });
  if (bookingA1.body?.data?.booking_number) {
    createdBookingNumbers.push(bookingA1.body.data.booking_number);
  }
  check("hotel A booking 1 201", bookingA1.status === 201, `got ${bookingA1.status}`);

  const bookingA2 = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "CRM ALPHA ONE",
      guest_email: sharedEmail.toUpperCase(),
      guest_phone: "+91 98765 01311",
      check_in_date: isoDaysFromNow(60),
      check_out_date: isoDaysFromNow(62),
      booking_status: "confirmed",
    },
  });
  if (bookingA2.body?.data?.booking_number) {
    createdBookingNumbers.push(bookingA2.body.data.booking_number);
  }
  check(
    "hotel A booking 2 same email 201",
    bookingA2.status === 201,
    `got ${bookingA2.status}`
  );

  const inquiryA = await query(
    `INSERT INTO inquiries (
       hotel_id, guest_name, guest_email, guest_phone, source, status
     ) VALUES ($1, $2, $3, $4, 'website', 'pending')
     RETURNING id`,
    [hotelA.hotel_id, "Crm Alpha Inquiry", sharedEmail, "+91 98765 01312"]
  );
  if (inquiryA.rows[0]?.id) createdInquiryIds.push(inquiryA.rows[0].id);
  check("hotel A inquiry inserted", Boolean(inquiryA.rows[0]?.id));

  const bookingOther = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "Crm Beta Unique",
      guest_email: otherEmail,
      guest_phone: "+91 98765 01320",
      check_in_date: isoDaysFromNow(70),
      check_out_date: isoDaysFromNow(72),
      booking_status: "confirmed",
    },
  });
  if (bookingOther.body?.data?.booking_number) {
    createdBookingNumbers.push(bookingOther.body.data.booking_number);
  }
  check("hotel A other-email booking 201", bookingOther.status === 201);

  const twin1 = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "Crm Phone Twin A",
      guest_email: phoneTwinA,
      guest_phone: samePhone,
      check_in_date: isoDaysFromNow(80),
      check_out_date: isoDaysFromNow(82),
      booking_status: "confirmed",
    },
  });
  if (twin1.body?.data?.booking_number) {
    createdBookingNumbers.push(twin1.body.data.booking_number);
  }
  const twin2 = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "Crm Phone Twin B",
      guest_email: phoneTwinB,
      guest_phone: samePhone,
      check_in_date: isoDaysFromNow(90),
      check_out_date: isoDaysFromNow(92),
      booking_status: "confirmed",
    },
  });
  if (twin2.body?.data?.booking_number) {
    createdBookingNumbers.push(twin2.body.data.booking_number);
  }
  check("same-phone different-email bookings 201", twin1.status === 201 && twin2.status === 201);

  const bookingB = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelB.hotel_id,
      room_type_id: hotelB.room_type_id,
      guest_name: "Crm Alpha Hotel B",
      guest_email: sharedEmail,
      guest_phone: "+91 98765 01330",
      check_in_date: isoDaysFromNow(55),
      check_out_date: isoDaysFromNow(57),
      booking_status: "confirmed",
    },
  });
  if (bookingB.body?.data?.booking_number) {
    createdBookingNumbers.push(bookingB.body.data.booking_number);
  }
  check("hotel B same-email booking 201", bookingB.status === 201, `got ${bookingB.status}`);

  const phoneOnlyInquiry = await query(
    `INSERT INTO inquiries (
       hotel_id, guest_name, guest_email, guest_phone, source, status
     ) VALUES ($1, 'Crm Phone Only Selftest', '', $2, 'phone', 'pending')
     RETURNING id`,
    [hotelA.hotel_id, "+91 98765 01401"]
  );
  if (phoneOnlyInquiry.rows[0]?.id) {
    createdInquiryIds.push(phoneOnlyInquiry.rows[0].id);
  }
  check("hotel A phone-only inquiry inserted", Boolean(phoneOnlyInquiry.rows[0]?.id));

  section("List grouping + isolation");
  const listA = await api(
    "GET",
    `/api/admin/guests?hotel_id=${hotelA.hotel_id}&limit=100`,
    { token }
  );
  check("hotel A list 200", listA.status === 200);
  check("hotel A hotel_id echoed", listA.body?.hotel_id === hotelA.hotel_id);

  const alpha = guestInList(listA, sharedEmail);
  check("same email grouped once", Boolean(alpha));
  check(
    "grouped booking_count is 2",
    alpha?.booking_count === 2,
    `got ${alpha?.booking_count}`
  );
  check(
    "grouped inquiry_count is 1",
    alpha?.inquiry_count === 1,
    `got ${alpha?.inquiry_count}`
  );
  check("repeat guest when 2 bookings", alpha?.is_repeat_guest === true);

  const beta = guestInList(listA, otherEmail);
  check("different email is a separate guest", Boolean(beta));
  check("other email is not repeat", beta?.is_repeat_guest === false);

  const twinA = guestInList(listA, phoneTwinA);
  const twinBRow = guestInList(listA, phoneTwinB);
  check(
    "same phone different emails are not merged",
    Boolean(twinA) &&
      Boolean(twinBRow) &&
      twinA.identity_key !== twinBRow.identity_key
  );

  const listB = await api(
    "GET",
    `/api/admin/guests?hotel_id=${hotelB.hotel_id}&limit=100`,
    { token }
  );
  check("hotel B list 200", listB.status === 200);
  const alphaOnB = guestInList(listB, sharedEmail);
  check("hotel B has the shared email once", Boolean(alphaOnB));
  check(
    "hotel B booking_count is 1 (not hotel A rows)",
    alphaOnB?.booking_count === 1,
    `got ${alphaOnB?.booking_count}`
  );
  check(
    "hotel B list excludes hotel A-only email",
    !guestInList(listB, otherEmail)
  );

  const phoneOnlyGuest = (listA.body?.data || []).find(
    (row) => row.identity_key === "phone:9876501401"
  );
  check("empty-email inquiry groups on last-10 phone", Boolean(phoneOnlyGuest));
  check(
    "hotel B list excludes hotel A phone-only guest",
    !(listB.body?.data || []).some((row) => row.identity_key === "phone:9876501401")
  );

  section("Search");
  const search = await api(
    "GET",
    `/api/admin/guests?hotel_id=${hotelA.hotel_id}&q=${encodeURIComponent("Crm Beta Unique")}&limit=100`,
    { token }
  );
  check("search 200", search.status === 200);
  check("search finds beta", Boolean(guestInList(search, otherEmail)));
  check(
    "search does not include unmatched alpha",
    !guestInList(search, sharedEmail)
  );
  const searchB = await api(
    "GET",
    `/api/admin/guests?hotel_id=${hotelB.hotel_id}&q=${encodeURIComponent("Crm Beta Unique")}&limit=100`,
    { token }
  );
  check(
    "search is hotel-scoped",
    searchB.status === 200 && !guestInList(searchB, otherEmail)
  );

  section("Guest 360 profile");
  const profileA = await api(
    "GET",
    `/api/admin/guests/profile?hotel_id=${hotelA.hotel_id}&key=${encodeURIComponent(`email:${sharedEmail}`)}`,
    { token }
  );
  check("hotel A profile 200", profileA.status === 200);
  check("profile hotel_id echoed", profileA.body?.hotel_id === hotelA.hotel_id);
  const profile = profileA.body?.data;
  check("profile booking history has 2", profile?.bookings?.length === 2);
  check("profile inquiry history has 1", profile?.inquiries?.length === 1);
  check("profile repeat flag", profile?.summary?.is_repeat_guest === true);
  check(
    "profile bookings stay on hotel A",
    (profile?.bookings || []).every((row) => row.hotel_id === hotelA.hotel_id)
  );
  check(
    "profile inquiries stay on hotel A",
    (profile?.inquiries || []).every((row) => row.hotel_id === hotelA.hotel_id)
  );

  const profileB = await api(
    "GET",
    `/api/admin/guests/profile?hotel_id=${hotelB.hotel_id}&key=${encodeURIComponent(`email:${sharedEmail}`)}`,
    { token }
  );
  check("hotel B profile 200", profileB.status === 200);
  check(
    "hotel B profile has 1 booking",
    profileB.body?.data?.bookings?.length === 1
  );
  check(
    "hotel B profile has 0 inquiries",
    profileB.body?.data?.inquiries?.length === 0
  );

  const missing = await api(
    "GET",
    `/api/admin/guests/profile?hotel_id=${hotelB.hotel_id}&key=${encodeURIComponent(`email:${otherEmail}`)}`,
    { token }
  );
  check("missing guest at hotel B 404", missing.status === 404);

  const phoneKeyProfile = await api(
    "GET",
    `/api/admin/guests/profile?hotel_id=${hotelA.hotel_id}&key=${encodeURIComponent("phone:9876501301")}`,
    { token }
  );
  check(
    "phone key does not silently merge emailed guests",
    phoneKeyProfile.status === 404
  );

  const phoneOnlyProfile = await api(
    "GET",
    `/api/admin/guests/profile?hotel_id=${hotelA.hotel_id}&key=${encodeURIComponent("phone:9876501401")}`,
    { token }
  );
  check("phone-only profile 200", phoneOnlyProfile.status === 200);
  check(
    "phone-only profile has no bookings",
    phoneOnlyProfile.body?.data?.bookings?.length === 0
  );
  check(
    "phone-only profile has 1 inquiry",
    phoneOnlyProfile.body?.data?.inquiries?.length === 1
  );

  console.log(`\n${passed} passed, ${failed} failed`);
}

main()
  .catch((error) => {
    failed += 1;
    console.error("\nVerification crashed:", error.message);
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (error) {
      console.error("Cleanup failed:", error.message);
    }
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  });
