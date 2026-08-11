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

export async function createAdminBooking(payload) {
  return adminApi("/api/admin/bookings", {
    method: "POST",
    body: payload,
  });
}

/** Sources staff typically select on the create form (website remains valid). */
export const ADMIN_CREATE_SOURCES = ["admin", "phone", "walk_in", "ota", "website"];

export const ADMIN_CREATE_BOOKING_STATUSES = ["pending", "confirmed"];

export function emptyAdminBookingForm() {
  return {
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    hotel_id: "",
    room_type_id: "",
    check_in_date: "",
    check_out_date: "",
    adults: "2",
    children: "0",
    number_of_rooms: "1",
    booking_source: "admin",
    booking_status: "confirmed",
    payment_status: "unpaid",
    special_requests: "",
    admin_notes: "",
  };
}

export function validateAdminBookingForm(form) {
  const fieldErrors = {};
  const name = String(form.guest_name || "").trim();
  if (name.length < 2) fieldErrors.guest_name = "Enter the guest name (min 2 characters).";
  else if (name.length > 150) fieldErrors.guest_name = "Name must be at most 150 characters.";

  const email = String(form.guest_email || "").trim();
  if (!email) fieldErrors.guest_email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    fieldErrors.guest_email = "Enter a valid email address.";
  }

  const phone = String(form.guest_phone || "").trim();
  if (phone.length < 7) fieldErrors.guest_phone = "Enter a valid phone number.";
  else if (phone.length > 50) fieldErrors.guest_phone = "Phone must be at most 50 characters.";

  if (!form.hotel_id) fieldErrors.hotel_id = "Select a hotel.";
  if (!form.room_type_id) fieldErrors.room_type_id = "Select a room type.";

  const checkIn = String(form.check_in_date || "").trim();
  const checkOut = String(form.check_out_date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) {
    fieldErrors.check_in_date = "Check-in date is required.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    fieldErrors.check_out_date = "Check-out date is required.";
  }
  if (
    !fieldErrors.check_in_date &&
    !fieldErrors.check_out_date &&
    checkOut <= checkIn
  ) {
    fieldErrors.check_out_date = "Check-out must be after check-in.";
  }

  const adults = Number(form.adults);
  if (!Number.isInteger(adults) || adults < 1 || adults > 30) {
    fieldErrors.adults = "Adults must be between 1 and 30.";
  }
  const children = Number(form.children);
  if (!Number.isInteger(children) || children < 0 || children > 30) {
    fieldErrors.children = "Children must be between 0 and 30.";
  }
  const rooms = Number(form.number_of_rooms);
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > 20) {
    fieldErrors.number_of_rooms = "Rooms must be between 1 and 20.";
  }

  if (!ADMIN_CREATE_SOURCES.includes(form.booking_source)) {
    fieldErrors.booking_source = "Select a booking source.";
  }
  if (!ADMIN_CREATE_BOOKING_STATUSES.includes(form.booking_status)) {
    fieldErrors.booking_status = "Status must be pending or confirmed.";
  }
  if (!PAYMENT_STATUSES.includes(form.payment_status)) {
    fieldErrors.payment_status = "Select a payment status.";
  }

  const notes = String(form.special_requests || "");
  if (notes.length > 2000) {
    fieldErrors.special_requests =
      "Guest special requests must be at most 2000 characters.";
  }

  const adminNotes = String(form.admin_notes || "");
  if (adminNotes.length > 2000) {
    fieldErrors.admin_notes = "Internal notes must be at most 2000 characters.";
  }

  return {
    ok: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

/**
 * Build POST /api/admin/bookings payload. Amounts come from room-type base_price
 * when quotable; otherwise zeros (on-request), matching public indicative pricing.
 */
export function formToAdminBookingPayload(form, { subtotal = 0, taxAmount = 0, totalAmount = 0, currency = "INR" } = {}) {
  return {
    hotel_id: form.hotel_id,
    room_type_id: form.room_type_id,
    guest_name: String(form.guest_name || "").trim(),
    guest_email: String(form.guest_email || "").trim().toLowerCase(),
    guest_phone: String(form.guest_phone || "").trim(),
    check_in_date: form.check_in_date,
    check_out_date: form.check_out_date,
    adults: Number(form.adults) || 1,
    children: Number(form.children) || 0,
    number_of_rooms: Number(form.number_of_rooms) || 1,
    booking_source: form.booking_source || "admin",
    booking_status: form.booking_status || "confirmed",
    payment_status: form.payment_status || "unpaid",
    special_requests: String(form.special_requests || "").trim() || null,
    admin_notes: String(form.admin_notes || "").trim() || null,
    subtotal: Number(subtotal) || 0,
    tax_amount: Number(taxAmount) || 0,
    total_amount: Number(totalAmount) || 0,
    currency: (currency || "INR").toUpperCase(),
  };
}
