import { adminApi, formatApiError } from "@/lib/adminHotels";

export { formatApiError, adminApi };

export async function listAdminGuests({ hotel_id, q, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (hotel_id) params.set("hotel_id", hotel_id);
  if (q) params.set("q", q);
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const qs = params.toString();
  return adminApi(`/api/admin/guests${qs ? `?${qs}` : ""}`);
}

export async function getAdminGuestProfile({ hotel_id, key } = {}) {
  const params = new URLSearchParams();
  if (hotel_id) params.set("hotel_id", hotel_id);
  if (key) params.set("key", key);
  const qs = params.toString();
  return adminApi(`/api/admin/guests/profile${qs ? `?${qs}` : ""}`);
}

export function guestProfileHref(hotelId, identityKey) {
  const params = new URLSearchParams();
  if (hotelId) params.set("hotel_id", hotelId);
  if (identityKey) params.set("key", identityKey);
  const qs = params.toString();
  return qs ? `/admin/guests/profile?${qs}` : "/admin/guests/profile";
}
