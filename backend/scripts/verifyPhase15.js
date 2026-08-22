/**
 * Phase 15 Lite — tenant isolation AuthZ verification.
 * Requires migration 009 applied and server running on :5001.
 *
 * Usage: node scripts/verifyPhase15.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");
const { hashPassword, signAdminToken } = require("../utils/adminAuth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";
const EMAIL_SUFFIX = "@phase15-selftest.invalid";
const TENANT_A_SLUG = "phase15-tenant-a-selftest";
const TENANT_B_SLUG = "phase15-tenant-b-selftest";

let passed = 0;
let failed = 0;

const fixtures = {
  tenantAId: null,
  tenantBId: null,
  hotelAId: null,
  hotelBId: null,
  roomTypeAId: null,
  roomTypeBId: null,
  adminAId: null,
  adminBId: null,
  adminInactiveId: null,
  hotelA2Id: null,
  mediaAId: null,
  bookingAId: null,
  bookingBId: null,
};

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

async function cleanupFixtures() {
  if (fixtures.mediaAId) {
    await query(`DELETE FROM hotel_media WHERE id = $1`, [fixtures.mediaAId]);
  }
  if (fixtures.bookingAId) {
    await query(`DELETE FROM bookings WHERE id = $1`, [fixtures.bookingAId]);
  }
  if (fixtures.bookingBId) {
    await query(`DELETE FROM bookings WHERE id = $1`, [fixtures.bookingBId]);
  }
  if (fixtures.roomTypeAId) {
    await query(`DELETE FROM room_types WHERE id = $1`, [fixtures.roomTypeAId]);
  }
  if (fixtures.roomTypeBId) {
    await query(`DELETE FROM room_types WHERE id = $1`, [fixtures.roomTypeBId]);
  }
  if (fixtures.adminInactiveId) {
    await query(`DELETE FROM tenant_memberships WHERE admin_user_id = $1`, [
      fixtures.adminInactiveId,
    ]);
    await query(`DELETE FROM admin_users WHERE id = $1`, [fixtures.adminInactiveId]);
  }
  if (fixtures.adminAId) {
    await query(`DELETE FROM tenant_memberships WHERE admin_user_id = $1`, [
      fixtures.adminAId,
    ]);
    await query(`DELETE FROM admin_users WHERE id = $1`, [fixtures.adminAId]);
  }
  if (fixtures.adminBId) {
    await query(`DELETE FROM tenant_memberships WHERE admin_user_id = $1`, [
      fixtures.adminBId,
    ]);
    await query(`DELETE FROM admin_users WHERE id = $1`, [fixtures.adminBId]);
  }
  if (fixtures.hotelA2Id) {
    await query(`DELETE FROM hotels WHERE id = $1`, [fixtures.hotelA2Id]);
  }
  if (fixtures.hotelAId) {
    await query(`DELETE FROM hotels WHERE id = $1`, [fixtures.hotelAId]);
  }
  if (fixtures.hotelBId) {
    await query(`DELETE FROM hotels WHERE id = $1`, [fixtures.hotelBId]);
  }
  if (fixtures.tenantAId) {
    await query(`DELETE FROM tenants WHERE id = $1`, [fixtures.tenantAId]);
  }
  if (fixtures.tenantBId) {
    await query(`DELETE FROM tenants WHERE id = $1`, [fixtures.tenantBId]);
  }
}

async function seedIsolationFixtures() {
  await cleanupFixtures();

  const tenantA = await query(
    `INSERT INTO tenants (name, slug, status, plan_code, subscription_status)
     VALUES ('Phase15 Tenant A', $1, 'active', 'lite', 'active')
     RETURNING id`,
    [TENANT_A_SLUG]
  );
  fixtures.tenantAId = tenantA.rows[0].id;

  const tenantB = await query(
    `INSERT INTO tenants (name, slug, status, plan_code, subscription_status)
     VALUES ('Phase15 Tenant B', $1, 'active', 'lite', 'active')
     RETURNING id`,
    [TENANT_B_SLUG]
  );
  fixtures.tenantBId = tenantB.rows[0].id;

  const hotelA = await query(
    `INSERT INTO hotels (tenant_id, slug, name, country, status)
     VALUES ($1, 'phase15-hotel-a-selftest', 'Phase15 Hotel A', 'India', 'active')
     RETURNING id`,
    [fixtures.tenantAId]
  );
  fixtures.hotelAId = hotelA.rows[0].id;

  const hotelA2 = await query(
    `INSERT INTO hotels (tenant_id, slug, name, country, status)
     VALUES ($1, 'phase15-hotel-a2-selftest', 'Phase15 Hotel A2', 'India', 'active')
     RETURNING id`,
    [fixtures.tenantAId]
  );
  fixtures.hotelA2Id = hotelA2.rows[0].id;

  const hotelB = await query(
    `INSERT INTO hotels (tenant_id, slug, name, country, status)
     VALUES ($1, 'phase15-hotel-b-selftest', 'Phase15 Hotel B', 'India', 'active')
     RETURNING id`,
    [fixtures.tenantBId]
  );
  fixtures.hotelBId = hotelB.rows[0].id;

  const roomTypeA = await query(
    `INSERT INTO room_types (hotel_id, slug, name, base_price, max_occupancy, status)
     VALUES ($1, 'standard', 'Standard', 1000, 2, 'active')
     RETURNING id`,
    [fixtures.hotelAId]
  );
  fixtures.roomTypeAId = roomTypeA.rows[0].id;

  const roomTypeB = await query(
    `INSERT INTO room_types (hotel_id, slug, name, base_price, max_occupancy, status)
     VALUES ($1, 'standard', 'Standard', 1000, 2, 'active')
     RETURNING id`,
    [fixtures.hotelBId]
  );
  fixtures.roomTypeBId = roomTypeB.rows[0].id;

  const passwordHash = await hashPassword("Phase15Selftest!123");

  const adminA = await query(
    `INSERT INTO admin_users (full_name, email, password_hash, role, is_active)
     VALUES ('Phase15 Admin A', $1, $2, 'hotel_admin', TRUE)
     RETURNING id, email, role`,
    [`admin-a${EMAIL_SUFFIX}`, passwordHash]
  );
  fixtures.adminAId = adminA.rows[0].id;

  const adminB = await query(
    `INSERT INTO admin_users (full_name, email, password_hash, role, is_active)
     VALUES ('Phase15 Admin B', $1, $2, 'hotel_admin', TRUE)
     RETURNING id, email, role`,
    [`admin-b${EMAIL_SUFFIX}`, passwordHash]
  );
  fixtures.adminBId = adminB.rows[0].id;

  await query(
    `INSERT INTO tenant_memberships (tenant_id, admin_user_id, membership_role, is_active)
     VALUES ($1, $2, 'owner', TRUE)`,
    [fixtures.tenantAId, fixtures.adminAId]
  );
  await query(
    `INSERT INTO tenant_memberships (tenant_id, admin_user_id, membership_role, is_active)
     VALUES ($1, $2, 'owner', TRUE)`,
    [fixtures.tenantBId, fixtures.adminBId]
  );

  const checkIn = isoDaysFromNow(30);
  const checkOut = isoDaysFromNow(32);

  const bookingA = await query(
    `INSERT INTO bookings (
       booking_number, hotel_id, room_type_id, guest_name, guest_email, guest_phone,
       check_in_date, check_out_date, booking_source, booking_status, payment_status,
       subtotal, tax_amount, total_amount
     ) VALUES (
       'P15A-SELFTEST', $1, $2, 'Guest A', $3, '9000000001',
       $4, $5, 'admin', 'confirmed', 'unpaid', 1000, 0, 1000
     ) RETURNING id`,
    [
      fixtures.hotelAId,
      fixtures.roomTypeAId,
      `guest-a${EMAIL_SUFFIX}`,
      checkIn,
      checkOut,
    ]
  );
  fixtures.bookingAId = bookingA.rows[0].id;

  const bookingB = await query(
    `INSERT INTO bookings (
       booking_number, hotel_id, room_type_id, guest_name, guest_email, guest_phone,
       check_in_date, check_out_date, booking_source, booking_status, payment_status,
       subtotal, tax_amount, total_amount
     ) VALUES (
       'P15B-SELFTEST', $1, $2, 'Guest B', $3, '9000000002',
       $4, $5, 'admin', 'confirmed', 'unpaid', 1000, 0, 1000
     ) RETURNING id`,
    [
      fixtures.hotelBId,
      fixtures.roomTypeBId,
      `guest-b${EMAIL_SUFFIX}`,
      checkIn,
      checkOut,
    ]
  );
  fixtures.bookingBId = bookingB.rows[0].id;

  const mediaA = await query(
    `INSERT INTO hotel_media (hotel_id, media_type, url, status)
     VALUES ($1, 'image', '/uploads/phase15-selftest.jpg', 'active')
     RETURNING id`,
    [fixtures.hotelAId]
  );
  fixtures.mediaAId = mediaA.rows[0].id;

  const adminInactive = await query(
    `INSERT INTO admin_users (full_name, email, password_hash, role, is_active)
     VALUES ('Phase15 Inactive Admin', $1, $2, 'hotel_admin', TRUE)
     RETURNING id, email, role`,
    [`admin-inactive${EMAIL_SUFFIX}`, passwordHash]
  );
  fixtures.adminInactiveId = adminInactive.rows[0].id;
  await query(
    `INSERT INTO tenant_memberships (tenant_id, admin_user_id, membership_role, is_active)
     VALUES ($1, $2, 'owner', FALSE)`,
    [fixtures.tenantAId, fixtures.adminInactiveId]
  );

  return {
    tokenA: signAdminToken(adminA.rows[0]),
    tokenB: signAdminToken(adminB.rows[0]),
    tokenInactive: signAdminToken(adminInactive.rows[0]),
  };
}

async function main() {
  section("Environment");
  const health = await api("GET", "/health");
  check(
    "backend health",
    health.status === 200 && health.body?.status === "healthy"
  );

  const tables = await query(
    `SELECT
       to_regclass('public.tenants') IS NOT NULL AS tenants,
       to_regclass('public.tenant_memberships') IS NOT NULL AS memberships`
  );
  check("tenants table exists", tables.rows[0]?.tenants === true);
  check("tenant_memberships table exists", tables.rows[0]?.memberships === true);

  section("Seed two-tenant isolation fixtures");
  const { tokenA, tokenB, tokenInactive } = await seedIsolationFixtures();
  check("tenant A fixture", Boolean(fixtures.tenantAId));
  check("tenant B fixture", Boolean(fixtures.tenantBId));
  check("hotel A fixture", Boolean(fixtures.hotelAId));
  check("hotel B fixture", Boolean(fixtures.hotelBId));

  section("Authorized same-tenant access");
  const ownHotel = await api("GET", `/api/admin/hotels/${fixtures.hotelAId}`, {
    token: tokenA,
  });
  check("tenant A admin reads own hotel", ownHotel.status === 200);

  const ownBooking = await api("GET", `/api/admin/bookings/${fixtures.bookingAId}`, {
    token: tokenA,
  });
  check("tenant A admin reads own booking by id", ownBooking.status === 200);

  const ownGuests = await api(
    "GET",
    `/api/admin/guests?hotel_id=${fixtures.hotelAId}`,
    { token: tokenA }
  );
  check("tenant A admin lists own guests", ownGuests.status === 200);

  const ownHotels = await api("GET", "/api/admin/hotels", { token: tokenA });
  const ownHotelIds = (ownHotels.body?.data || []).map((row) => row.id);
  check(
    "tenant A admin hotel list scoped to tenant hotels only",
    ownHotels.status === 200 &&
      ownHotelIds.length === 2 &&
      ownHotelIds.includes(fixtures.hotelAId) &&
      ownHotelIds.includes(fixtures.hotelA2Id) &&
      !ownHotelIds.includes(fixtures.hotelBId)
  );

  section("Cross-tenant hotel_id access blocked");
  const crossHotelList = await api(
    "GET",
    `/api/admin/bookings?hotel_id=${fixtures.hotelBId}`,
    { token: tokenA }
  );
  check("tenant A blocked on tenant B hotel_id list", crossHotelList.status === 404);

  const crossGuests = await api(
    "GET",
    `/api/admin/guests?hotel_id=${fixtures.hotelBId}`,
    { token: tokenA }
  );
  check("tenant A blocked on tenant B guests", crossGuests.status === 404);

  const crossInventory = await api(
    "GET",
    `/api/admin/inventory/day?hotel_id=${fixtures.hotelBId}&room_type_id=${fixtures.roomTypeBId}&date=${isoDaysFromNow(1)}`,
    { token: tokenA }
  );
  check("tenant A blocked on tenant B inventory", crossInventory.status === 404);

  section("Cross-tenant resource-by-id blocked");
  const crossBooking = await api("GET", `/api/admin/bookings/${fixtures.bookingBId}`, {
    token: tokenA,
  });
  check("tenant A blocked on tenant B booking id", crossBooking.status === 404);

  const crossHotelById = await api("GET", `/api/admin/hotels/${fixtures.hotelBId}`, {
    token: tokenA,
  });
  check("tenant A blocked on tenant B hotel id", crossHotelById.status === 404);

  const crossRoomType = await api(
    "GET",
    `/api/admin/room-types/${fixtures.roomTypeBId}`,
    { token: tokenA }
  );
  check("tenant A blocked on tenant B room type id", crossRoomType.status === 404);

  section("Symmetric tenant B isolation");
  const reverseCross = await api("GET", `/api/admin/bookings/${fixtures.bookingAId}`, {
    token: tokenB,
  });
  check("tenant B blocked on tenant A booking id", reverseCross.status === 404);

  section("Media updateMedia hotel_id reassignment");
  const sameTenantReassign = await api(
    "PATCH",
    `/api/admin/media/${fixtures.mediaAId}`,
    {
      token: tokenA,
      body: { hotel_id: fixtures.hotelA2Id },
    }
  );
  check(
    "same-tenant media hotel_id reassignment succeeds",
    sameTenantReassign.status === 200 &&
      sameTenantReassign.body?.data?.hotel_id === fixtures.hotelA2Id
  );

  const crossTenantReassign = await api(
    "PATCH",
    `/api/admin/media/${fixtures.mediaAId}`,
    {
      token: tokenA,
      body: { hotel_id: fixtures.hotelBId },
    }
  );
  check(
    "cross-tenant media hotel_id reassignment blocked",
    crossTenantReassign.status === 404
  );

  const inactiveReassign = await api(
    "PATCH",
    `/api/admin/media/${fixtures.mediaAId}`,
    {
      token: tokenInactive,
      body: { hotel_id: fixtures.hotelA2Id },
    }
  );
  check(
    "inactive membership cannot reassign media hotel_id",
    inactiveReassign.status === 404
  );

  section("Platform super_admin bypass preserved");
  const superAdmin = await query(
    `SELECT id, email, role FROM admin_users WHERE role = 'super_admin' AND is_active = TRUE LIMIT 1`
  );
  if (superAdmin.rows[0]) {
    const superToken = signAdminToken(superAdmin.rows[0]);
    const superBookingB = await api("GET", `/api/admin/bookings/${fixtures.bookingBId}`, {
      token: superToken,
    });
    check("super_admin can read cross-tenant booking", superBookingB.status === 200);
    const unscopedStats = await api("GET", "/api/admin/bookings/stats", {
      token: superToken,
    });
    check("super_admin unscoped stats still work", unscopedStats.status === 200);
  } else {
    check("super_admin present for bypass check", false, "run seed:admin");
  }

  section("Summary");
  console.log(`\nPhase 15 verification: ${passed} passed, ${failed} failed`);
}

main()
  .catch((error) => {
    failed += 1;
    console.error(`Phase 15 verification FAILED: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanupFixtures();
      console.log("\nCleaned up Phase 15 self-test tenants/hotels/admins.");
    } catch (cleanupError) {
      console.error(`Cleanup warning: ${cleanupError.message}`);
    }
    await pool.end();
  });
