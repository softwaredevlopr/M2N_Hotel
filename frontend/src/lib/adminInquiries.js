import { adminApi, formatApiError } from "@/lib/adminHotels";

export { formatApiError, adminApi };

export const INQUIRY_STATUSES = [
  "pending",
  "contacted",
  "quoted",
  "confirmed",
  "declined",
  "cancelled",
];

export async function listAdminInquiries({
  q,
  status,
  hotel_id,
  hotel_slug,
  limit,
  offset,
} = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (hotel_id) params.set("hotel_id", hotel_id);
  if (hotel_slug) params.set("hotel_slug", hotel_slug);
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const qs = params.toString();
  return adminApi(`/api/inquiries${qs ? `?${qs}` : ""}`);
}

export async function getAdminInquiry(id) {
  return adminApi(`/api/inquiries/${encodeURIComponent(id)}`);
}

export async function updateAdminInquiryStatus(id, payload) {
  return adminApi(`/api/inquiries/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAdminInquiry(id) {
  return adminApi(`/api/inquiries/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
