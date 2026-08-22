const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("./error.middleware");
const { loadAdminTenancy } = require("../utils/adminTenancy");

/**
 * Loads active tenant memberships for the authenticated admin and attaches
 * req.tenancy. Must run after requireAdminAuth.
 */
const resolveAdminTenancy = asyncHandler(async (req, _res, next) => {
  if (!req.admin) {
    throw new AppError("Authentication required", 401);
  }

  req.tenancy = await loadAdminTenancy(req.admin);
  return next();
});

module.exports = {
  resolveAdminTenancy,
};
