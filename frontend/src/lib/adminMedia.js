import { API_BASE_URL } from "@/lib/api";
import { getAdminToken } from "@/lib/adminAuth";
import { adminApi, formatApiError } from "@/lib/adminHotels";

export { formatApiError, adminApi };

export const MEDIA_CATEGORIES = [
  "Hero",
  "Gallery",
  "Room",
  "Restaurant",
  "Exterior",
  "Lobby",
  "Amenities",
];

export const MEDIA_STATUSES = ["active", "inactive", "archived"];

/** Resolve media URL for preview (relative /uploads → API origin). */
export function resolveAdminMediaUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}

export async function listAdminMedia({
  q,
  hotel_id,
  category,
  status,
} = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (hotel_id) params.set("hotel_id", hotel_id);
  if (category) params.set("category", category);
  if (status) params.set("status", status);
  const qs = params.toString();
  return adminApi(`/api/admin/media${qs ? `?${qs}` : ""}`);
}

export async function getAdminMedia(id) {
  return adminApi(`/api/admin/media/${encodeURIComponent(id)}`);
}

export async function updateAdminMedia(id, payload) {
  return adminApi(`/api/admin/media/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAdminMedia(id) {
  return adminApi(`/api/admin/media/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/**
 * Multipart upload. Field order matters for multer destination:
 * hotel_id + category before file.
 */
export async function uploadAdminMedia(form) {
  const token = getAdminToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      data: { success: false, message: "Not authenticated" },
      unauthorized: true,
    };
  }

  const formData = new FormData();
  formData.append("hotel_id", form.hotel_id);
  formData.append("category", form.category || "Gallery");
  formData.append("alt_text", form.alt_text || "");
  formData.append("caption", form.caption || "");
  formData.append("sort_order", String(form.sort_order ?? 0));
  formData.append("status", form.status || "active");
  formData.append("is_cover", form.is_cover ? "true" : "false");
  formData.append("file", form.file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/media/upload`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    return {
      ok: response.ok && data?.success === true,
      status: response.status,
      data,
      unauthorized: response.status === 401,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      networkError: true,
      message: error?.message || "Network error",
    };
  }
}

export function emptyMediaUploadForm() {
  return {
    hotel_id: "",
    category: "Gallery",
    alt_text: "",
    caption: "",
    sort_order: "0",
    status: "active",
    is_cover: false,
    file: null,
  };
}

export function mediaToForm(row) {
  if (!row) {
    return {
      hotel_id: "",
      category: "Gallery",
      alt_text: "",
      caption: "",
      sort_order: "0",
      status: "active",
      is_cover: false,
      url: "",
    };
  }
  return {
    hotel_id: row.hotel_id || "",
    category: row.category || "Gallery",
    alt_text: row.alt_text || "",
    caption: row.caption || "",
    sort_order:
      row.sort_order === null || row.sort_order === undefined
        ? "0"
        : String(row.sort_order),
    status: row.status || "active",
    is_cover: Boolean(row.is_cover),
    url: row.url || "",
  };
}

export function formToMediaUpdatePayload(form) {
  return {
    hotel_id: String(form.hotel_id || "").trim(),
    category: form.category || "Gallery",
    alt_text: String(form.alt_text || "").trim() || null,
    caption: String(form.caption || "").trim() || null,
    sort_order: Number(form.sort_order || 0),
    status: form.status || "active",
    is_cover: Boolean(form.is_cover),
  };
}

export function validateMediaUploadForm(form) {
  const fieldErrors = {};
  const errors = [];

  if (!String(form.hotel_id || "").trim()) {
    fieldErrors.hotel_id = "Hotel is required.";
  }
  if (!form.category || !MEDIA_CATEGORIES.includes(form.category)) {
    fieldErrors.category = "Category is required.";
  }
  if (!form.file) {
    fieldErrors.file = "Please choose an image to upload.";
  } else if (form.file.type && !form.file.type.startsWith("image/")) {
    fieldErrors.file = "Only image files are allowed.";
  } else if (form.file.size && form.file.size > 5 * 1024 * 1024) {
    fieldErrors.file = "Image must be 5MB or smaller.";
  }

  if (String(form.alt_text || "").length > 255) {
    fieldErrors.alt_text = "Alt text must be at most 255 characters.";
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

  Object.values(fieldErrors).forEach((msg) => errors.push(msg));
  return { ok: errors.length === 0, errors, fieldErrors };
}

export function validateMediaEditForm(form) {
  const fieldErrors = {};
  const errors = [];

  if (!String(form.hotel_id || "").trim()) {
    fieldErrors.hotel_id = "Hotel is required.";
  }
  if (!form.category || !MEDIA_CATEGORIES.includes(form.category)) {
    fieldErrors.category = "Category is required.";
  }
  if (String(form.alt_text || "").length > 255) {
    fieldErrors.alt_text = "Alt text must be at most 255 characters.";
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
  if (form.status && !MEDIA_STATUSES.includes(form.status)) {
    fieldErrors.status = `Status must be one of: ${MEDIA_STATUSES.join(", ")}.`;
  }

  Object.values(fieldErrors).forEach((msg) => errors.push(msg));
  return { ok: errors.length === 0, errors, fieldErrors };
}
