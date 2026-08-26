/**
 * Phase 15 Lite — self-serve onboarding API verification.
 * Requires migration 009 and server on :5001.
 *
 * Usage: node scripts/verifyPhase15Onboarding.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";
const SUFFIX = `p15ob-${Date.now()}`;
const EMAIL = `owner-${SUFFIX}@phase15-onboard.invalid`;

let passed = 0;
let failed = 0;

const created = {
  tenantId: null,
  adminId: null,
  hotelId: null,
  tenantSlug: `tenant-${SUFFIX}`,
  hotelSlug: `hotel-${SUFFIX}`,
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

async function cleanup() {
  if (created.hotelId) {
    await query(`DELETE FROM hotels WHERE id = $1`, [created.hotelId]);
  }
  if (created.adminId) {
    await query(`DELETE FROM tenant_memberships WHERE admin_user_id = $1`, [
      created.adminId,
    ]);
    await query(`DELETE FROM admin_users WHERE id = $1`, [created.adminId]);
  }
  if (created.tenantId) {
    await query(`DELETE FROM tenants WHERE id = $1`, [created.tenantId]);
  }
  // Also wipe by slug/email in case partial failures left rows.
  await query(`DELETE FROM hotels WHERE slug = $1`, [created.hotelSlug]);
  await query(
    `DELETE FROM tenant_memberships
     WHERE admin_user_id IN (SELECT id FROM admin_users WHERE email = $1)`,
    [EMAIL]
  );
  await query(`DELETE FROM admin_users WHERE email = $1`, [EMAIL]);
  await query(`DELETE FROM tenants WHERE slug = $1`, [created.tenantSlug]);
}

async function main() {
  section("Environment");
  const health = await api("GET", "/health");
  check(
    "backend health",
    health.status === 200 && health.body?.status === "healthy"
  );

  const m2nBefore = await query(
    `SELECT id, slug, status FROM tenants WHERE slug = 'm2n-hotels' LIMIT 1`
  );
  check("m2n-hotels tenant exists before onboarding", m2nBefore.rows.length === 1);
  const m2nId = m2nBefore.rows[0]?.id;
  const m2nHotelCountBefore = m2nId
    ? (
        await query(`SELECT COUNT(*)::int AS n FROM hotels WHERE tenant_id = $1`, [
          m2nId,
        ])
      ).rows[0].n
    : 0;

  section("Onboarding succeeds");
  const onboard = await api("POST", "/api/admin/onboarding", {
    body: {
      tenant_name: "Phase15 Onboard Tenant",
      tenant_slug: created.tenantSlug,
      owner_name: "Phase15 Owner",
      owner_email: EMAIL,
      owner_password: "OnboardTest!123",
      hotel_name: "Phase15 Onboard Hotel",
      hotel_slug: created.hotelSlug,
      city: "Test City",
      country: "India",
      phone: "9000000099",
    },
  });

  const data = onboard.body?.data;
  check("onboarding returns 201", onboard.status === 201);
  check("tenant returned", Boolean(data?.tenant?.id));
  check("admin returned", Boolean(data?.admin?.id));
  check("hotel returned", Boolean(data?.hotel?.id));
  check("access_token returned", typeof data?.access_token === "string");
  check("token_type Bearer", data?.token_type === "Bearer");
  check("expires_in present", Boolean(data?.expires_in));
  check("password_hash not returned", data?.admin?.password_hash === undefined);

  created.tenantId = data?.tenant?.id || null;
  created.adminId = data?.admin?.id || null;
  created.hotelId = data?.hotel?.id || null;

  section("DB rows created correctly");
  if (created.tenantId) {
    const tenant = await query(
      `SELECT status, plan_code, subscription_status, billing_email
       FROM tenants WHERE id = $1`,
      [created.tenantId]
    );
    const t = tenant.rows[0];
    check("tenant status trial", t?.status === "trial");
    check("tenant plan_code lite", t?.plan_code === "lite");
    check("tenant subscription_status trialing", t?.subscription_status === "trialing");
  } else {
    check("tenant status trial", false);
    check("tenant plan_code lite", false);
    check("tenant subscription_status trialing", false);
  }

  if (created.adminId) {
    const admin = await query(
      `SELECT role, is_active, email FROM admin_users WHERE id = $1`,
      [created.adminId]
    );
    check("admin role hotel_admin", admin.rows[0]?.role === "hotel_admin");
    check("admin is_active", admin.rows[0]?.is_active === true);
  } else {
    check("admin role hotel_admin", false);
    check("admin is_active", false);
  }

  if (created.tenantId && created.adminId) {
    const membership = await query(
      `SELECT membership_role, is_active
       FROM tenant_memberships
       WHERE tenant_id = $1 AND admin_user_id = $2`,
      [created.tenantId, created.adminId]
    );
    check(
      "owner membership created",
      membership.rows[0]?.membership_role === "owner" &&
        membership.rows[0]?.is_active === true
    );
  } else {
    check("owner membership created", false);
  }

  if (created.hotelId && created.tenantId) {
    const hotel = await query(`SELECT tenant_id, status FROM hotels WHERE id = $1`, [
      created.hotelId,
    ]);
    check(
      "first hotel belongs to new tenant",
      hotel.rows[0]?.tenant_id === created.tenantId
    );
    check("first hotel status draft", hotel.rows[0]?.status === "draft");
  } else {
    check("first hotel belongs to new tenant", false);
    check("first hotel status draft", false);
  }

  section("Returned JWT works");
  const me = await api("GET", "/api/admin/auth/me", {
    token: data?.access_token,
  });
  check("JWT /me 200", me.status === 200);
  check("JWT /me matches onboarded admin", me.body?.data?.id === created.adminId);

  section("Isolation from other tenants");
  const otherHotels = await api("GET", "/api/admin/hotels", {
    token: data?.access_token,
  });
  const hotelIds = (otherHotels.body?.data || []).map((row) => row.id);
  check("onboarded admin hotel list 200", otherHotels.status === 200);
  check(
    "onboarded admin sees only own hotel",
    hotelIds.length === 1 && hotelIds[0] === created.hotelId
  );

  if (m2nId) {
    const m2nHotels = await query(
      `SELECT id FROM hotels WHERE tenant_id = $1 LIMIT 1`,
      [m2nId]
    );
    const foreignId = m2nHotels.rows[0]?.id;
    if (foreignId) {
      const cross = await api("GET", `/api/admin/hotels/${foreignId}`, {
        token: data?.access_token,
      });
      check("onboarded admin blocked from m2n hotel", cross.status === 404);
    } else {
      check("onboarded admin blocked from m2n hotel", false, "no m2n hotel");
    }
  } else {
    check("onboarded admin blocked from m2n hotel", false, "no m2n tenant");
  }

  section("m2n-hotels remains intact");
  const m2nAfter = await query(
    `SELECT id, slug FROM tenants WHERE slug = 'm2n-hotels' LIMIT 1`
  );
  check("m2n-hotels still present", m2nAfter.rows.length === 1);
  if (m2nId) {
    const m2nHotelCountAfter = (
      await query(`SELECT COUNT(*)::int AS n FROM hotels WHERE tenant_id = $1`, [
        m2nId,
      ])
    ).rows[0].n;
    check(
      "m2n hotel count unchanged",
      m2nHotelCountAfter === m2nHotelCountBefore
    );
  } else {
    check("m2n hotel count unchanged", false);
  }

  section("Duplicate conflict returns safe 409");
  const dup = await api("POST", "/api/admin/onboarding", {
    body: {
      tenant_name: "Phase15 Onboard Tenant Dup",
      tenant_slug: created.tenantSlug,
      owner_name: "Phase15 Owner Dup",
      owner_email: EMAIL,
      owner_password: "OnboardTest!123",
      hotel_name: "Phase15 Onboard Hotel Dup",
      hotel_slug: `${created.hotelSlug}-dup`,
    },
  });
  check("duplicate onboarding returns 409", dup.status === 409);
  check(
    "duplicate message is generic",
    typeof dup.body?.message === "string" &&
      !String(dup.body.message).toLowerCase().includes("email") &&
      !String(dup.body.message).toLowerCase().includes("already exists")
  );

  section("Summary");
  console.log(
    `\nPhase 15 onboarding verification: ${passed} passed, ${failed} failed`
  );
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    failed += 1;
    console.error(`Phase 15 onboarding verification FAILED: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
      console.log("\nCleaned up Phase 15 onboarding self-test data.");
    } catch (cleanupError) {
      console.error(`Cleanup warning: ${cleanupError.message}`);
    }
    await pool.end();
  });
