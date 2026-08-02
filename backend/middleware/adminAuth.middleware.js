const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("./error.middleware");
const {
  normalizeEmail,
  toPublicAdmin,
  verifyAdminToken,
} = require("../utils/adminAuth");

const ADMIN_SELECT = `
  id, full_name, email, role, is_active, last_login_at, created_at, updated_at
`;

/**
 * JWT authentication for admin routes.
 * Expects: Authorization: Bearer <token>
 * On success: attaches public admin profile to req.admin
 */
const requireAdminAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string" || !header.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401);
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new AppError("Authentication required", 401);
  }

  let decoded;
  try {
    decoded = verifyAdminToken(token);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError("Token expired", 401);
    }
    throw new AppError("Invalid or expired token", 401);
  }

  const adminId = decoded.sub;
  if (!adminId) {
    throw new AppError("Invalid or expired token", 401);
  }

  const result = await query(
    `SELECT ${ADMIN_SELECT}
     FROM admin_users
     WHERE id = $1
     LIMIT 1`,
    [adminId]
  );

  if (result.rows.length === 0) {
    throw new AppError("Invalid or expired token", 401);
  }

  const admin = result.rows[0];
  if (!admin.is_active) {
    throw new AppError("Account is inactive", 403);
  }

  req.admin = toPublicAdmin(admin);
  return next();
});

module.exports = {
  requireAdminAuth,
  normalizeEmail,
};
