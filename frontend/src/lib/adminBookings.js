import { adminApi, formatApiError } from "@/lib/adminHotels";

export { formatApiError, adminApi };

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
];

export const PAYMENT_STATUSES = ["unpaid", "partial", "paid", "refunded"];

export const BOOKING_SOURCES = [
  "website",
  "admin",
  "phone",
  "walk_in",
  "ota",
];

/** Mirrors backend BOOKING_STATUS_TRANSITIONS — keep in sync. */
export const BOOKING_STATUS_TRANSITIONS = {
  pending: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checked_out", "cancelled"],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

export const BOOKING_SORT_FIELDS = [
  "created_at",
  "check_in_date",
  "check_out_date",
  "guest_name",
  "booking_status",
  "total_amount",
  "booking_number",
];

export function canTransitionBookingStatus(from, to) {
  if (from === to) return true;
  return (BOOKING_STATUS_TRANSITIONS[from] || []).includes(to);
}

export function nextBookingActions(status) {
  const next = BOOKING_STATUS_TRANSITIONS[status] || [];
  return next.map((value) => ({
    value,
    label: STATUS_ACTION_LABELS[value] || value.replace(/_/g, " "),
  }));
}

const STATUS_ACTION_LABELS = {
  confirmed: "Confirm booking",
  cancelled: "Cancel booking",
  checked_in: "Check in",
  checked_out: "Check out",
  no_show: "Mark no show",
};

export async function listAdminBookings({
  search,
  hotel_id,
  booking_status,
  payment_status,
  booking_source,
  check_in_from,
  check_in_to,
  sort,
  order,
  limit,
  offset,
} = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (hotel_id) params.set("hotel_id", hotel_id);
  if (booking_status) params.set("booking_status", booking_status);
  if (payment_status) params.set("payment_status", payment_status);
  if (booking_source) params.set("booking_source", booking_source);
  if (check_in_from) params.set("check_in_from", check_in_from);
  if (check_in_to) params.set("check_in_to", check_in_to);
  if (sort) params.set("sort", sort);
  if (order) params.set("order", order);
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const qs = params.toString();
  return adminApi(`/api/admin/bookings${qs ? `?${qs}` : ""}`);
}

export async function getAdminBookingStats() {
  return adminApi("/api/admin/bookings/stats");
}

export async function getAdminBooking(id) {
  return adminApi(`/api/admin/bookings/${encodeURIComponent(id)}`);
}

export async function updateAdminBookingStatus(id, payload) {
  return adminApi(`/api/admin/bookings/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: payload,
  });
}

export async function updateAdminBooking(id, payload) {
  return adminApi(`/api/admin/bookings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function assignAdminBookingRoom(id, room_id) {
  return adminApi(`/api/admin/bookings/${encodeURIComponent(id)}/assign-room`, {
    method: "PATCH",
    body: { room_id },
  });
}
