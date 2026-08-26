const { pool } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const { AppError } = require("../middleware/error.middleware");
const {
  normalizeEmail,
  hashPassword,
  signAdminToken,
  toPublicAdmin,
  getJwtExpiresIn,
} = require("../utils/adminAuth");

const HOTEL_PUBLIC_FIELDS = `
  id, tenant_id, slug, name, tagline, description, email, phone, website_url,
  address_line1, address_line2, city, state, country, postal_code,
  timezone, check_in_time, check_out_time, currency_code, star_rating,
  status, is_featured, metadata, created_at, updated_at
`;

const TENANT_PUBLIC_FIELDS = `
  id, name, slug, status, billing_email, plan_code, subscription_status,
  trial_ends_at, current_period_end, metadata, created_at, updated_at
`;

const CONFLICT_MESSAGE = "Unable to create account with the provided details";

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return typeof value === "string" ? value.trim() : value;
}

function normalizeSlug(slug) {
  return String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/**
 * Public self-serve onboarding — creates tenant, owner admin, membership, and
 * first hotel in one transaction. No JWT required.
 */
const onboard = asyncHandler(async (req, res) => {
  const body = req.body || {};

  const tenantName = emptyToNull(body.tenant_name);
  const tenantSlug = normalizeSlug(body.tenant_slug);
  const ownerName = emptyToNull(body.owner_name);
  const ownerEmail = normalizeEmail(body.owner_email);
  const ownerPassword =
    typeof body.owner_password === "string" ? body.owner_password : "";
  const hotelName = emptyToNull(body.hotel_name);
  const hotelSlug = normalizeSlug(body.hotel_slug);
  const city = emptyToNull(body.city);
  const state = emptyToNull(body.state);
  const country = emptyToNull(body.country) || "India";
  const phone = emptyToNull(body.phone);

  if (!tenantSlug) {
    throw new AppError("tenant_slug is required", 400);
  }
  if (!hotelSlug) {
    throw new AppError("hotel_slug is required", 400);
  }

  const passwordHash = await hashPassword(ownerPassword);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tenantResult = await client.query(
      `INSERT INTO tenants (
         name, slug, status, billing_email, plan_code, subscription_status
       )
       VALUES ($1, $2, 'trial', $3, 'lite', 'trialing')
       RETURNING ${TENANT_PUBLIC_FIELDS}`,
      [tenantName, tenantSlug, ownerEmail]
    );
    const tenant = tenantResult.rows[0];

    const adminResult = await client.query(
      `INSERT INTO admin_users (
         full_name, email, password_hash, role, is_active
       )
       VALUES ($1, $2, $3, 'hotel_admin', TRUE)
       RETURNING id, full_name, email, role, is_active,
                 last_login_at, created_at, updated_at`,
      [ownerName, ownerEmail, passwordHash]
    );
    const admin = toPublicAdmin(adminResult.rows[0]);

    await client.query(
      `INSERT INTO tenant_memberships (
         tenant_id, admin_user_id, membership_role, is_active
       )
       VALUES ($1, $2, 'owner', TRUE)`,
      [tenant.id, admin.id]
    );

    const hotelResult = await client.query(
      `INSERT INTO hotels (
         tenant_id, slug, name, phone, city, state, country,
         timezone, check_in_time, check_out_time, currency_code,
         status, is_featured, metadata
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         'Asia/Kolkata', '14:00:00', '11:00:00', 'INR',
         'draft', FALSE, '{}'::jsonb
       )
       RETURNING ${HOTEL_PUBLIC_FIELDS}`,
      [tenant.id, hotelSlug, hotelName, phone, city, state, country]
    );
    const hotel = hotelResult.rows[0];

    await client.query("COMMIT");

    const accessToken = signAdminToken(admin);

    return sendSuccess(res, 201, {
      data: {
        tenant,
        admin,
        hotel,
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: getJwtExpiresIn(),
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }

    if (error.code === "23505") {
      throw new AppError(CONFLICT_MESSAGE, 409);
    }
    throw error;
  } finally {
    client.release();
  }
});

module.exports = {
  onboard,
};
