import { API_BASE_URL } from "@/lib/api";
import { getAdminToken } from "@/lib/adminAuth";

/**
 * Authenticated fetch for admin hotel APIs.
 * Uses Bearer token from localStorage.
 */
export async function adminApi(path, { method = "GET", body } = {}) {
  const token = getAdminToken();
  if (!token) {
    return {
      ok: false,
      status: 401,
      data: { success: false, message: "Not authenticated" },
      unauthorized: true,
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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

export async function listAdminHotels({ q, status } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  const qs = params.toString();
  return adminApi(`/api/admin/hotels${qs ? `?${qs}` : ""}`);
}

export async function getAdminHotel(id) {
  return adminApi(`/api/admin/hotels/${encodeURIComponent(id)}`);
}

export async function createAdminHotel(payload) {
  return adminApi("/api/admin/hotels", { method: "POST", body: payload });
}

export async function updateAdminHotel(id, payload) {
  return adminApi(`/api/admin/hotels/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAdminHotel(id) {
  return adminApi(`/api/admin/hotels/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** Hotel statuses from the hotels.status CHECK constraint. */
export const HOTEL_STATUSES = ["draft", "active", "inactive", "archived"];

const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Client validation aligned with backend adminHotel.validator + controller rules.
 * Returns { ok, errors: string[], fieldErrors: Record<field, string> }.
 */
export function validateHotelForm(form, { partial = false } = {}) {
  const fieldErrors = {};
  const errors = [];

  const name = String(form.name || "").trim();
  const slug = String(form.slug || "").trim();

  if (!partial || form.name !== undefined) {
    if (!name) {
      fieldErrors.name = "Name is required.";
    } else if (name.length > 255) {
      fieldErrors.name = "Name must be at most 255 characters.";
    }
  }

  if (!partial || form.slug !== undefined) {
    if (!slug) {
      fieldErrors.slug = "Slug is required.";
    } else if (slug.length > 120) {
      fieldErrors.slug = "Slug must be at most 120 characters.";
    }
  }

  const maxLens = {
    tagline: 500,
    email: 255,
    phone: 50,
    website_url: 500,
    address_line1: 255,
    address_line2: 255,
    city: 120,
    state: 120,
    country: 120,
    postal_code: 20,
    timezone: 64,
    currency_code: 3,
  };

  Object.entries(maxLens).forEach(([field, max]) => {
    const value = String(form[field] || "").trim();
    if (value && value.length > max) {
      fieldErrors[field] = `${field} must be at most ${max} characters.`;
    }
  });

  const email = String(form.email || "").trim();
  if (email && !EMAIL_REGEX.test(email)) {
    fieldErrors.email = "Email must be a valid email address.";
  }

  const description = String(form.description || "");
  if (description.length > 20000) {
    fieldErrors.description = "Description must be at most 20000 characters.";
  }

  ["check_in_time", "check_out_time"].forEach((field) => {
    const value = String(form[field] || "").trim();
    if (value && !TIME_REGEX.test(value)) {
      fieldErrors[field] = `${field} must be HH:MM or HH:MM:SS.`;
    }
  });

  if (form.star_rating !== "" && form.star_rating !== null && form.star_rating !== undefined) {
    const n = Number(form.star_rating);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      fieldErrors.star_rating = "Star rating must be an integer between 1 and 5.";
    }
  }

  if (form.status && !HOTEL_STATUSES.includes(form.status)) {
    fieldErrors.status = `Status must be one of: ${HOTEL_STATUSES.join(", ")}.`;
  }

  Object.values(fieldErrors).forEach((msg) => errors.push(msg));

  return {
    ok: errors.length === 0,
    errors,
    fieldErrors,
  };
}

export function formatApiError(result, fallback = "Something went wrong.") {
  if (result?.networkError) {
    return "Unable to reach the server. Please try again.";
  }
  const message = result?.data?.message;
  const details = Array.isArray(result?.data?.errors)
    ? result.data.errors.join(" ")
    : "";
  if (message && details) return `${message}: ${details}`;
  if (message) return message;
  if (details) return details;
  return result?.message || fallback;
}

export function slugifyHotelName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function emptyHotelForm() {
  return {
    slug: "",
    name: "",
    tagline: "",
    description: "",
    email: "",
    phone: "",
    website_url: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    country: "India",
    postal_code: "",
    timezone: "Asia/Kolkata",
    check_in_time: "14:00",
    check_out_time: "11:00",
    currency_code: "INR",
    star_rating: "",
    status: "draft",
    is_featured: false,
  };
}

export function hotelToForm(hotel) {
  if (!hotel) return emptyHotelForm();
  const trimTime = (t) => {
    if (!t) return "";
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
  };
  return {
    slug: hotel.slug || "",
    name: hotel.name || "",
    tagline: hotel.tagline || "",
    description: hotel.description || "",
    email: hotel.email || "",
    phone: hotel.phone || "",
    website_url: hotel.website_url || "",
    address_line1: hotel.address_line1 || "",
    address_line2: hotel.address_line2 || "",
    city: hotel.city || "",
    state: hotel.state || "",
    country: hotel.country || "India",
    postal_code: hotel.postal_code || "",
    timezone: hotel.timezone || "Asia/Kolkata",
    check_in_time: trimTime(hotel.check_in_time) || "14:00",
    check_out_time: trimTime(hotel.check_out_time) || "11:00",
    currency_code: hotel.currency_code || "INR",
    star_rating:
      hotel.star_rating === null || hotel.star_rating === undefined
        ? ""
        : String(hotel.star_rating),
    status: hotel.status || "draft",
    is_featured: Boolean(hotel.is_featured),
  };
}

/** Build API payload from form state (schema columns only). */
export function formToPayload(form) {
  const payload = {
    slug: form.slug.trim(),
    name: form.name.trim(),
    tagline: form.tagline.trim() || null,
    description: form.description.trim() || null,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    website_url: form.website_url.trim() || null,
    address_line1: form.address_line1.trim() || null,
    address_line2: form.address_line2.trim() || null,
    city: form.city.trim() || null,
    state: form.state.trim() || null,
    country: form.country.trim() || "India",
    postal_code: form.postal_code.trim() || null,
    timezone: form.timezone.trim() || "Asia/Kolkata",
    check_in_time: form.check_in_time || null,
    check_out_time: form.check_out_time || null,
    currency_code: (form.currency_code || "INR").trim().toUpperCase(),
    status: form.status || "draft",
    is_featured: Boolean(form.is_featured),
  };

  if (form.star_rating === "" || form.star_rating === null) {
    payload.star_rating = null;
  } else {
    payload.star_rating = Number(form.star_rating);
  }

  return payload;
}
