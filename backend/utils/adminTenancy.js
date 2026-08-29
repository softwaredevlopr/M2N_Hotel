const { query } = require("../config/db");
const { AppError } = require("../middleware/error.middleware");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isPlatformSuperAdmin(admin) {
  return admin?.role === "super_admin";
}

async function loadAdminTenancy(admin) {
  if (isPlatformSuperAdmin(admin)) {
    return {
      isPlatformAdmin: true,
      memberships: [],
      tenantIds: null,
      permittedHotelIds: null,
    };
  }

  const membershipsResult = await query(
    `SELECT tm.tenant_id, tm.membership_role
     FROM tenant_memberships tm
     INNER JOIN tenants t ON t.id = tm.tenant_id
     WHERE tm.admin_user_id = $1
       AND tm.is_active = TRUE
       AND t.status <> 'cancelled'`,
    [admin.id]
  );

  const memberships = membershipsResult.rows;
  if (memberships.length === 0) {
    return {
      isPlatformAdmin: false,
      memberships: [],
      tenantIds: [],
      permittedHotelIds: [],
    };
  }

  const tenantIds = memberships.map((row) => row.tenant_id);
  const hotelsResult = await query(
    `SELECT id FROM hotels WHERE tenant_id = ANY($1::uuid[])`,
    [tenantIds]
  );

  return {
    isPlatformAdmin: false,
    memberships,
    tenantIds,
    permittedHotelIds: hotelsResult.rows.map((row) => row.id),
  };
}

function assertTenancyResolved(tenancy) {
  if (!tenancy) {
    throw new AppError("Tenant context is not available", 500);
  }
}

function assertHotelAccess(
  tenancy,
  hotelId,
  { notFoundMessage = "Hotel not found" } = {}
) {
  assertTenancyResolved(tenancy);
  if (!hotelId || !UUID_REGEX.test(String(hotelId))) {
    throw new AppError(notFoundMessage, 404);
  }
  if (tenancy.isPlatformAdmin) {
    return;
  }
  if (!tenancy.permittedHotelIds.includes(hotelId)) {
    throw new AppError(notFoundMessage, 404);
  }
}

function appendPermittedHotelScope(
  conditions,
  params,
  tenancy,
  column,
  requestedHotelId = null
) {
  assertTenancyResolved(tenancy);

  if (requestedHotelId) {
    assertHotelAccess(tenancy, requestedHotelId);
    params.push(requestedHotelId);
    conditions.push(`${column} = $${params.length}`);
    return requestedHotelId;
  }

  if (tenancy.isPlatformAdmin) {
    return null;
  }

  if (!tenancy.permittedHotelIds.length) {
    conditions.push("FALSE");
    return null;
  }

  params.push(tenancy.permittedHotelIds);
  conditions.push(`${column} = ANY($${params.length}::uuid[])`);
  return null;
}

async function assertResourceHotelAccess(
  tenancy,
  { table, idColumn, id, notFoundMessage = "Resource not found" }
) {
  if (!UUID_REGEX.test(String(id))) {
    throw new AppError(notFoundMessage, 404);
  }

  const result = await query(
    `SELECT hotel_id FROM ${table} WHERE ${idColumn} = $1 LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(notFoundMessage, 404);
  }

  assertHotelAccess(tenancy, result.rows[0].hotel_id, { notFoundMessage });
  return result.rows[0].hotel_id;
}

async function assertHotelRecordAccess(tenancy, hotelId, notFoundMessage = "Hotel not found") {
  if (!UUID_REGEX.test(String(hotelId))) {
    throw new AppError(notFoundMessage, 404);
  }

  if (tenancy.isPlatformAdmin) {
    const result = await query(`SELECT id FROM hotels WHERE id = $1 LIMIT 1`, [hotelId]);
    if (result.rows.length === 0) {
      throw new AppError(notFoundMessage, 404);
    }
    return hotelId;
  }

  assertHotelAccess(tenancy, hotelId, { notFoundMessage });
  return hotelId;
}

async function resolveTenantId(
  tenancy,
  requestedTenantId,
  {
    accessDeniedMessage = "Tenant not found",
    missingDefaultStatus = 404,
    missingDefaultMessage = "Tenant not found",
  } = {}
) {
  assertTenancyResolved(tenancy);

  const normalizedRequest =
    typeof requestedTenantId === "string" && UUID_REGEX.test(requestedTenantId)
      ? requestedTenantId
      : null;

  if (tenancy.isPlatformAdmin) {
    if (normalizedRequest) {
      const tenant = await query(`SELECT id FROM tenants WHERE id = $1 LIMIT 1`, [
        normalizedRequest,
      ]);
      if (tenant.rows.length === 0) {
        throw new AppError("Tenant not found", 404);
      }
      return normalizedRequest;
    }

    const defaultTenant = await query(
      `SELECT id FROM tenants WHERE slug = 'm2n-hotels' LIMIT 1`
    );
    if (defaultTenant.rows.length === 0) {
      throw new AppError(missingDefaultMessage, missingDefaultStatus);
    }
    return defaultTenant.rows[0].id;
  }

  if (!tenancy.tenantIds.length) {
    throw new AppError("No tenant access configured for this account", 403);
  }

  if (normalizedRequest) {
    if (!tenancy.tenantIds.includes(normalizedRequest)) {
      throw new AppError(accessDeniedMessage, 404);
    }
    return normalizedRequest;
  }

  if (tenancy.tenantIds.length === 1) {
    return tenancy.tenantIds[0];
  }

  throw new AppError("tenant_id is required when you belong to multiple tenants", 400);
}

async function resolveCreateTenantId(req) {
  const tenancy = req.tenancy;
  const requestedTenantId =
    typeof req.body?.tenant_id === "string" && UUID_REGEX.test(req.body.tenant_id)
      ? req.body.tenant_id
      : null;

  return resolveTenantId(tenancy, requestedTenantId, {
    accessDeniedMessage: "Hotel not found",
    missingDefaultStatus: 400,
    missingDefaultMessage: "tenant_id is required to create a hotel",
  });
}

async function resolveReadTenantId(tenancy, query = {}) {
  const requestedTenantId =
    typeof query.tenant_id === "string" && UUID_REGEX.test(query.tenant_id)
      ? query.tenant_id
      : null;

  return resolveTenantId(tenancy, requestedTenantId);
}

module.exports = {
  UUID_REGEX,
  isPlatformSuperAdmin,
  loadAdminTenancy,
  assertTenancyResolved,
  assertHotelAccess,
  appendPermittedHotelScope,
  assertResourceHotelAccess,
  assertHotelRecordAccess,
  resolveCreateTenantId,
  resolveReadTenantId,
  resolveTenantId,
};
