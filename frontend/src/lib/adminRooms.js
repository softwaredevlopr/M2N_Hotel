import { adminApi, formatApiError } from "@/lib/adminHotels";

export { formatApiError, adminApi };

/** Inventory statuses from rooms.status CHECK constraint. */
export const ROOM_STATUSES = [
  "available",
  "occupied",
  "maintenance",
  "blocked",
  "out_of_service",
];

export async function listAdminRooms({
  q,
  hotel_id,
  room_type_id,
  status,
} = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (hotel_id) params.set("hotel_id", hotel_id);
  if (room_type_id) params.set("room_type_id", room_type_id);
  if (status) params.set("status", status);
  const qs = params.toString();
  return adminApi(`/api/admin/rooms${qs ? `?${qs}` : ""}`);
}

export async function getAdminRoom(id) {
  return adminApi(`/api/admin/rooms/${encodeURIComponent(id)}`);
}

export async function createAdminRoom(payload) {
  return adminApi("/api/admin/rooms", { method: "POST", body: payload });
}

export async function updateAdminRoom(id, payload) {
  return adminApi(`/api/admin/rooms/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAdminRoom(id) {
  return adminApi(`/api/admin/rooms/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function emptyRoomForm() {
  return {
    hotel_id: "",
    room_type_id: "",
    room_number: "",
    floor_label: "",
    status: "available",
    notes: "",
  };
}

export function roomToForm(row) {
  if (!row) return emptyRoomForm();
  return {
    hotel_id: row.hotel_id || "",
    room_type_id: row.room_type_id || "",
    room_number: row.room_number || "",
    floor_label: row.floor_label || "",
    status: row.status || "available",
    notes: row.notes || "",
  };
}

export function formToRoomPayload(form) {
  return {
    hotel_id: String(form.hotel_id || "").trim(),
    room_type_id: String(form.room_type_id || "").trim(),
    room_number: String(form.room_number || "").trim(),
    floor_label: String(form.floor_label || "").trim() || null,
    status: form.status || "available",
    notes: String(form.notes || "").trim() || null,
  };
}

export function validateRoomForm(form) {
  const fieldErrors = {};
  const errors = [];

  if (!String(form.hotel_id || "").trim()) {
    fieldErrors.hotel_id = "Hotel is required.";
  }

  if (!String(form.room_type_id || "").trim()) {
    fieldErrors.room_type_id = "Room type is required.";
  }

  const roomNumber = String(form.room_number || "").trim();
  if (!roomNumber) {
    fieldErrors.room_number = "Room number is required.";
  } else if (roomNumber.length > 30) {
    fieldErrors.room_number = "Room number must be at most 30 characters.";
  }

  const floor = String(form.floor_label || "").trim();
  if (floor.length > 30) {
    fieldErrors.floor_label = "Floor label must be at most 30 characters.";
  }

  const notes = String(form.notes || "");
  if (notes.length > 20000) {
    fieldErrors.notes = "Notes must be at most 20000 characters.";
  }

  if (form.status && !ROOM_STATUSES.includes(form.status)) {
    fieldErrors.status = `Status must be one of: ${ROOM_STATUSES.join(", ")}.`;
  }

  Object.values(fieldErrors).forEach((msg) => errors.push(msg));

  return {
    ok: errors.length === 0,
    errors,
    fieldErrors,
  };
}
