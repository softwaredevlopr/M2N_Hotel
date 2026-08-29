import { adminApi, formatApiError } from "@/lib/adminHotels";

export { formatApiError };

/**
 * Read-only current tenant billing summary — GET /api/admin/tenant
 */
export async function getAdminTenant({ tenantId } = {}) {
  const params = new URLSearchParams();
  if (tenantId) params.set("tenant_id", tenantId);
  const qs = params.toString();
  return adminApi(`/api/admin/tenant${qs ? `?${qs}` : ""}`);
}
