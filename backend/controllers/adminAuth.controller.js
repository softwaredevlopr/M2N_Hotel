const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const { AppError } = require("../middleware/error.middleware");
const {
  normalizeEmail,
  toPublicAdmin,
  verifyPassword,
  signAdminToken,
  getJwtExpiresIn,
} = require("../utils/adminAuth");

const ADMIN_SELECT_WITH_HASH = `
  id, full_name, email, password_hash, role, is_active,
  last_login_at, created_at, updated_at
`;

const login = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === "string" ? req.body.password : "";

  const result = await query(
    `SELECT ${ADMIN_SELECT_WITH_HASH}
     FROM admin_users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  // Generic message for missing user or bad password (no account enumeration).
  const invalidMessage = "Invalid email or password";

  if (result.rows.length === 0) {
    throw new AppError(invalidMessage, 401);
  }

  const admin = result.rows[0];

  if (!admin.is_active) {
    throw new AppError("Account is inactive", 403);
  }

  const passwordOk = await verifyPassword(password, admin.password_hash);
  if (!passwordOk) {
    throw new AppError(invalidMessage, 401);
  }

  await query(
    `UPDATE admin_users
     SET last_login_at = NOW()
     WHERE id = $1`,
    [admin.id]
  );

  const refreshed = await query(
    `SELECT id, full_name, email, role, is_active, last_login_at, created_at, updated_at
     FROM admin_users
     WHERE id = $1
     LIMIT 1`,
    [admin.id]
  );

  const publicAdmin = toPublicAdmin(refreshed.rows[0]);
  const accessToken = signAdminToken(publicAdmin);

  return sendSuccess(res, 200, {
    data: {
      admin: publicAdmin,
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: getJwtExpiresIn(),
    },
  });
});

const me = asyncHandler(async (req, res) => {
  // req.admin is attached by requireAdminAuth (already without password_hash).
  return sendSuccess(res, 200, { data: req.admin });
});

module.exports = {
  login,
  me,
};
