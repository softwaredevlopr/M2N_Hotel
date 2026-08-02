const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { AppError } = require("../middleware/error.middleware");

const BCRYPT_ROUNDS = 12;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).trim().length === 0) {
    throw new AppError("JWT_SECRET is not configured on the server", 500);
  }
  return secret;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || "8h";
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function toPublicAdmin(row) {
  if (!row) return null;
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

function signAdminToken(admin) {
  const payload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role,
  };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
  });
}

function verifyAdminToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  BCRYPT_ROUNDS,
  normalizeEmail,
  toPublicAdmin,
  hashPassword,
  verifyPassword,
  signAdminToken,
  verifyAdminToken,
  getJwtExpiresIn,
};
