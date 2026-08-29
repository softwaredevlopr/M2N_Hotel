/**
 * Phase 15 Lite — read-only tenant billing summary API verification.
 * Requires migration 009 applied and server running on :5001.
 *
 * Usage: npm run verify:phase15-billing
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { query } = require("../config/db");
const { hashPassword, signAdminToken } = require("../utils/adminAuth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";
const EMAIL_SUFFIX = "@phase15-billing-selftest.invalid";
const TENANT_A_SLUG = "phase15-billing-tenant-a";
const TENANT_B_SLUG = "phase15-billing-tenant-b";

const SAFE_FIELDS = [
  "id",
  "name",
  "slug",
  "status",
  "plan_code",
  "subscription_status",
  "trial_ends_at",
  "current_period_end",
  "billing_email",
];

let passed = 0;
let failed = 0;

const fixtures = {
  tenantAId: null,
  tenantBId: null,
  adminAId: null,
  adminBId: null,
  adminMultiId: null,
  adminNoMembershipId: null,
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

function hasOnlySafeFields(data) {
  if (!data || typeof data !== "object") return false;
  const keys = Object.keys(data).sort();
  const expected = [...SAFE_FIELDS].sort();
  return JSON.stringify(keys) === JSON.stringify(expected);
}

async function cleanupFixtures() {
  if (fixtures.adminMultiId) {
    await query(`DELETE FROM tenant_memberships WHERE admin_user_id = $1`, [
      fixtures.adminMultiId,
    ]);
    await query(`DELETE FROM admin_users WHERE id = $1`, [fixtures.adminMultiId]);
  }
  if (fixtures.adminNoMembershipId) {
    await query(`DELETE FROM admin_users WHERE id = $1`, [fixtures.adminNoMembershipId]);
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
  if (fixtures.tenantAId) {
    await query(`DELETE FROM tenants WHERE id = $1`, [fixtures.tenantAId]);
  }
  if (fixtures.tenantBId) {
    await query(`DELETE FROM tenants WHERE id = $1`, [fixtures.tenantBId]);
  }
}

async function seedFixtures() {
  await cleanupFixtures();

  const tenantA = await query(
    `INSERT INTO tenants (
       name, slug, status, billing_email, plan_code, subscription_status,
       trial_ends_at, current_period_end, metadata
     )
     VALUES (
       'Billing Tenant A', $1, 'trial', $2, 'lite', 'trialing',
       NOW() + INTERVAL '14 days', NOW() + INTERVAL '30 days',
       '{"internal": true}'::jsonb
     )
     RETURNING id`,
    [TENANT_A_SLUG, `billing-a${EMAIL_SUFFIX}`]
  );
  fixtures.tenantAId = tenantA.rows[0].id;

  const tenantB = await query(
    `INSERT INTO tenants (name, slug, status, plan_code, subscription_status)
     VALUES ('Billing Tenant B', $1, 'active', 'lite', 'active')
     RETURNING id`,
    [TENANT_B_SLUG]
  );
  fixtures.tenantBId = tenantB.rows[0].id;

  const passwordHash = await hashPassword("Phase15Billing!123");

  const adminA = await query(
    `INSERT INTO admin_users (full_name, email, password_hash, role, is_active)
     VALUES ('Billing Admin A', $1, $2, 'hotel_admin', TRUE)
     RETURNING id, email, role`,
    [`admin-a${EMAIL_SUFFIX}`, passwordHash]
  );
  fixtures.adminAId = adminA.rows[0].id;

  const adminB = await query(
    `INSERT INTO admin_users (full_name, email, password_hash, role, is_active)
     VALUES ('Billing Admin B', $1, $2, 'hotel_admin', TRUE)
     RETURNING id, email, role`,
    [`admin-b${EMAIL_SUFFIX}`, passwordHash]
  );
  fixtures.adminBId = adminB.rows[0].id;

  const adminMulti = await query(
    `INSERT INTO admin_users (full_name, email, password_hash, role, is_active)
     VALUES ('Billing Admin Multi', $1, $2, 'hotel_admin', TRUE)
     RETURNING id, email, role`,
    [`admin-multi${EMAIL_SUFFIX}`, passwordHash]
  );
  fixtures.adminMultiId = adminMulti.rows[0].id;

  const adminNoMembership = await query(
    `INSERT INTO admin_users (full_name, email, password_hash, role, is_active)
     VALUES ('Billing Admin None', $1, $2, 'hotel_admin', TRUE)
     RETURNING id, email, role`,
    [`admin-none${EMAIL_SUFFIX}`, passwordHash]
  );
  fixtures.adminNoMembershipId = adminNoMembership.rows[0].id;

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
  await query(
    `INSERT INTO tenant_memberships (tenant_id, admin_user_id, membership_role, is_active)
     VALUES ($1, $2, 'owner', TRUE), ($3, $2, 'staff', TRUE)`,
    [fixtures.tenantAId, fixtures.adminMultiId, fixtures.tenantBId]
  );

  return {
    tokenA: signAdminToken(adminA.rows[0]),
    tokenB: signAdminToken(adminB.rows[0]),
    tokenMulti: signAdminToken(adminMulti.rows[0]),
    tokenNoMembership: signAdminToken(adminNoMembership.rows[0]),
  };
}

async function main() {
  try {
    section("Environment");
    const health = await api("GET", "/health");
    check("backend health", health.status === 200);

    const tokens = await seedFixtures();

    section("hotel_admin own tenant");
    const own = await api("GET", "/api/admin/tenant", { token: tokens.tokenA });
    check("own tenant returns 200", own.status === 200);
    const ownData = own.body?.data;
    check("response has only safe fields", hasOnlySafeFields(ownData));
    check("metadata not returned", ownData?.metadata === undefined);
    check("created_at not returned", ownData?.created_at === undefined);
    check("updated_at not returned", ownData?.updated_at === undefined);
    check("tenant id matches", ownData?.id === fixtures.tenantAId);
    check("plan_code returned", ownData?.plan_code === "lite");
    check("billing_email returned", ownData?.billing_email === `billing-a${EMAIL_SUFFIX}`);

    section("Cross-tenant access blocked");
    const cross = await api(
      "GET",
      `/api/admin/tenant?tenant_id=${fixtures.tenantBId}`,
      { token: tokens.tokenA }
    );
    check("cross-tenant tenant_id returns 404", cross.status === 404);

    section("No membership");
    const noMembership = await api("GET", "/api/admin/tenant", {
      token: tokens.tokenNoMembership,
    });
    check("no membership returns 403", noMembership.status === 403);

    section("Multiple memberships");
    const multiMissing = await api("GET", "/api/admin/tenant", {
      token: tokens.tokenMulti,
    });
    check("multi-membership without tenant_id returns 400", multiMissing.status === 400);
    check(
      "multi-membership message mentions tenant_id",
      String(multiMissing.body?.message || "").includes("tenant_id")
    );

    const multiA = await api(
      "GET",
      `/api/admin/tenant?tenant_id=${fixtures.tenantAId}`,
      { token: tokens.tokenMulti }
    );
    check("multi-membership explicit tenant A returns 200", multiA.status === 200);
    check("multi-membership tenant A id matches", multiA.body?.data?.id === fixtures.tenantAId);

    const multiCross = await api(
      "GET",
      `/api/admin/tenant?tenant_id=${fixtures.tenantAId}`,
      { token: tokens.tokenB }
    );
    check("other admin cannot read tenant A by id", multiCross.status === 404);

    section("super_admin");
    const superRow = await query(
      `SELECT id, email, role FROM admin_users WHERE role = 'super_admin' AND is_active = TRUE LIMIT 1`
    );
    if (superRow.rows.length > 0) {
      const superToken = signAdminToken(superRow.rows[0]);
      const m2n = await query(
        `SELECT id, slug FROM tenants WHERE slug = 'm2n-hotels' LIMIT 1`
      );

      const superDefault = await api("GET", "/api/admin/tenant", {
        token: superToken,
      });
      check("super_admin default tenant returns 200", superDefault.status === 200);
      if (m2n.rows.length > 0) {
        check(
          "super_admin default is m2n-hotels",
          superDefault.body?.data?.id === m2n.rows[0].id
        );
      }

      const superExplicit = await api(
        "GET",
        `/api/admin/tenant?tenant_id=${fixtures.tenantAId}`,
        { token: superToken }
      );
      check("super_admin explicit tenant_id returns 200", superExplicit.status === 200);
      check(
        "super_admin explicit tenant matches",
        superExplicit.body?.data?.id === fixtures.tenantAId
      );
    } else {
      check("super_admin present for billing checks", false, "run seed:admin");
    }

    section("Read-only");
    const postAttempt = await api("POST", "/api/admin/tenant", {
      token: tokens.tokenA,
      body: { plan_code: "enterprise" },
    });
    check("POST /api/admin/tenant is not allowed", postAttempt.status === 404);

    const patchAttempt = await api("PATCH", "/api/admin/tenant", {
      token: tokens.tokenA,
      body: { plan_code: "enterprise" },
    });
    check("PATCH /api/admin/tenant is not allowed", patchAttempt.status === 404);

    section("Summary");
    console.log(`\nPhase 15 billing verification: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Phase 15 billing verification FAILED: ${error.message}`);
    process.exitCode = 1;
  } finally {
    try {
      await cleanupFixtures();
      console.log("\nCleaned up Phase 15 billing self-test data.");
    } catch (cleanupError) {
      console.error(`Cleanup failed: ${cleanupError.message}`);
      process.exitCode = 1;
    }
  }
}

main();
