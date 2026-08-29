const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");
const { AppError } = require("../middleware/error.middleware");
const { resolveReadTenantId } = require("../utils/adminTenancy");

const TENANT_BILLING_FIELDS = `
  id, name, slug, status, plan_code, subscription_status,
  trial_ends_at, current_period_end, billing_email
`;

const getTenant = asyncHandler(async (req, res) => {
  const tenantId = await resolveReadTenantId(req.tenancy, req.query);

  const result = await query(
    `SELECT ${TENANT_BILLING_FIELDS}
     FROM tenants
     WHERE id = $1
     LIMIT 1`,
    [tenantId]
  );

  if (result.rows.length === 0) {
    throw new AppError("Tenant not found", 404);
  }

  return sendSuccess(res, 200, { data: result.rows[0] });
});

module.exports = {
  getTenant,
};
