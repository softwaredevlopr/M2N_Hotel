import { adminApi, formatApiError, slugifyHotelName } from "@/lib/adminHotels";

export { formatApiError, adminApi };

export const ROOM_TYPE_STATUSES = ["draft", "active", "inactive", "archived"];

export async function listAdminRoomTypes({
  q,
  hotel_id,
  status,
  featured,
} = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (hotel_id) params.set("hotel_id", hotel_id);
  if (status) params.set("status", status);
  if (featured) params.set("featured", "true");
  const qs = params.toString();
  return adminApi(`/api/admin/room-types${qs ? `?${qs}` : ""}`);
}

export async function getAdminRoomType(id) {
  return adminApi(`/api/admin/room-types/${encodeURIComponent(id)}`);
}

export async function createAdminRoomType(payload) {
  return adminApi("/api/admin/room-types", { method: "POST", body: payload });
}

export async function updateAdminRoomType(id, payload) {
  return adminApi(`/api/admin/room-types/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAdminRoomType(id) {
  return adminApi(`/api/admin/room-types/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function slugifyRoomTypeName(name) {
  return slugifyHotelName(name);
}

export function emptyRoomTypeForm() {
  return {
    hotel_id: "",
    slug: "",
    name: "",
    description: "",
    base_price: "",
    max_occupancy: "2",
    bed_type: "",
    room_size_sqft: "",
    status: "draft",
    sort_order: "0",
    is_featured: false,
  };
}

export function roomTypeToForm(row) {
  if (!row) return emptyRoomTypeForm();
  return {
    hotel_id: row.hotel_id || "",
    slug: row.slug || "",
    name: row.name || "",
    description: row.description || "",
    base_price:
      row.base_price === null || row.base_price === undefined
        ? ""
        : String(row.base_price),
    max_occupancy:
      row.max_occupancy === null || row.max_occupancy === undefined
        ? "2"
        : String(row.max_occupancy),
    bed_type: row.bed_type || "",
    room_size_sqft:
      row.room_size_sqft === null || row.room_size_sqft === undefined
        ? ""
        : String(row.room_size_sqft),
    status: row.status || "draft",
    sort_order:
      row.sort_order === null || row.sort_order === undefined
        ? "0"
        : String(row.sort_order),
    is_featured: Boolean(row.is_featured),
  };
}

/** Build API payload from form state (schema columns + is_featured → metadata). */
export function formToRoomTypePayload(form) {
  const payload = {
    hotel_id: String(form.hotel_id || "").trim(),
    slug: String(form.slug || "").trim(),
    name: String(form.name || "").trim(),
    description: String(form.description || "").trim() || null,
    bed_type: String(form.bed_type || "").trim() || null,
    status: form.status || "draft",
    is_featured: Boolean(form.is_featured),
  };

  if (form.base_price === "" || form.base_price === null) {
    payload.base_price = 0;
  } else {
    payload.base_price = Number(form.base_price);
  }

  if (form.max_occupancy === "" || form.max_occupancy === null) {
    payload.max_occupancy = 2;
  } else {
    payload.max_occupancy = Number(form.max_occupancy);
  }

  if (form.room_size_sqft === "" || form.room_size_sqft === null) {
    payload.room_size_sqft = null;
  } else {
    payload.room_size_sqft = Number(form.room_size_sqft);
  }

  if (form.sort_order === "" || form.sort_order === null) {
    payload.sort_order = 0;
  } else {
    payload.sort_order = Number(form.sort_order);
  }

  return payload;
}

/**
 * Client validation aligned with backend adminRoomType rules.
 */
export function validateRoomTypeForm(form) {
  const fieldErrors = {};
  const errors = [];

  if (!String(form.hotel_id || "").trim()) {
    fieldErrors.hotel_id = "Hotel is required.";
  }

  const name = String(form.name || "").trim();
  if (!name) {
    fieldErrors.name = "Name is required.";
  } else if (name.length > 150) {
    fieldErrors.name = "Name must be at most 150 characters.";
  }

  const slug = String(form.slug || "").trim();
  if (!slug) {
    fieldErrors.slug = "Slug is required.";
  } else if (slug.length > 120) {
    fieldErrors.slug = "Slug must be at most 120 characters.";
  }

  const description = String(form.description || "");
  if (description.length > 20000) {
    fieldErrors.description = "Description must be at most 20000 characters.";
  }

  const bedType = String(form.bed_type || "").trim();
  if (bedType.length > 80) {
    fieldErrors.bed_type = "Bed type must be at most 80 characters.";
  }

  if (form.base_price !== "" && form.base_price !== null && form.base_price !== undefined) {
    const n = Number(form.base_price);
    if (!Number.isFinite(n) || n < 0) {
      fieldErrors.base_price = "Base price must be a number ≥ 0.";
    }
  }

  if (
    form.max_occupancy !== "" &&
    form.max_occupancy !== null &&
    form.max_occupancy !== undefined
  ) {
    const n = Number(form.max_occupancy);
    if (!Number.isInteger(n) || n < 1) {
      fieldErrors.max_occupancy = "Max occupancy must be an integer ≥ 1.";
    }
  }

  if (
    form.room_size_sqft !== "" &&
    form.room_size_sqft !== null &&
    form.room_size_sqft !== undefined
  ) {
    const n = Number(form.room_size_sqft);
    if (!Number.isInteger(n) || n <= 0) {
      fieldErrors.room_size_sqft = "Room size must be an integer > 0.";
    }
  }

  if (
    form.sort_order !== "" &&
    form.sort_order !== null &&
    form.sort_order !== undefined
  ) {
    const n = Number(form.sort_order);
    if (!Number.isInteger(n)) {
      fieldErrors.sort_order = "Sort order must be an integer.";
    }
  }

  if (form.status && !ROOM_TYPE_STATUSES.includes(form.status)) {
    fieldErrors.status = `Status must be one of: ${ROOM_TYPE_STATUSES.join(", ")}.`;
  }

  Object.values(fieldErrors).forEach((msg) => errors.push(msg));

  return {
    ok: errors.length === 0,
    errors,
    fieldErrors,
  };
}
