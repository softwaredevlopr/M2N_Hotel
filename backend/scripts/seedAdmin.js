require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");
const {
  normalizeEmail,
  hashPassword,
  toPublicAdmin,
} = require("../utils/adminAuth");

function log(message) {
  console.log(`[seed:admin] ${message}`);
}

function logError(message) {
  console.error(`[seed:admin] ${message}`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || String(value).trim().length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in backend/.env before running seed:admin.`
    );
  }
  return String(value).trim();
}

async function resolveDefaultTenantId() {
  const result = await query(
    `SELECT id FROM tenants WHERE slug = 'm2n-hotels' LIMIT 1`
  );
  if (result.rows.length === 0) {
    throw new Error(
      "Default tenant 'm2n-hotels' not found. Run migrations through 009_tenancy_lite.sql before seeding admin."
    );
  }
  return result.rows[0].id;
}

async function ensureDefaultTenantMembership(adminUserId) {
  const tenantId = await resolveDefaultTenantId();
  const result = await query(
    `INSERT INTO tenant_memberships (
       tenant_id, admin_user_id, membership_role, is_active
     )
     VALUES ($1, $2, 'owner', TRUE)
     ON CONFLICT (tenant_id, admin_user_id) DO NOTHING
     RETURNING id`,
    [tenantId, adminUserId]
  );

  if (result.rows.length > 0) {
    log("Ensured owner membership on default tenant m2n-hotels.");
  } else {
    log(
      "Default tenant membership already present for this admin (left unchanged)."
    );
  }
}

async function seedAdmin() {
  const fullName = requireEnv("ADMIN_NAME");
  const email = normalizeEmail(requireEnv("ADMIN_EMAIL"));
  const password = requireEnv("ADMIN_PASSWORD");

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  // Ensure the admin_users table exists (migration 002 applied).
  const tableCheck = await query(
    `SELECT to_regclass('public.admin_users') AS table_name`
  );
  if (!tableCheck.rows[0]?.table_name) {
    throw new Error(
      "Table admin_users does not exist. Run `npm run migrate` first."
    );
  }

  const existing = await query(
    `SELECT id, email, role, is_active
     FROM admin_users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  let adminId;

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    adminId = row.id;
    log(
      `Admin already exists for email "${row.email}" (id=${row.id}, role=${row.role}, active=${row.is_active}). Skipping insert.`
    );
    if (row.is_active === false) {
      log(
        `WARNING: Existing admin "${row.email}" is inactive. Membership ensure will still run; account was not reactivated.`
      );
    }
  } else {
    const passwordHash = await hashPassword(password);

    const result = await query(
      `INSERT INTO admin_users (full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'super_admin', TRUE)
       RETURNING id, full_name, email, role, is_active, last_login_at, created_at, updated_at`,
      [fullName, email, passwordHash]
    );

    const created = toPublicAdmin(result.rows[0]);
    adminId = created.id;
    log(`Created super_admin: ${created.email} (id=${created.id}).`);
    log("Password was hashed and was not printed.");
  }

  await ensureDefaultTenantMembership(adminId);
}

seedAdmin()
  .catch((error) => {
    logError(`FAILED: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    log("Database pool closed.");
  });
