import { adminApi, formatApiError } from "@/lib/adminHotels";

export { formatApiError, adminApi };

export const TARIFF_STATUSES = ["active", "inactive"];

export const MEAL_PLANS = [
  { id: "no_meal", label: "No Meal" },
  { id: "breakfast", label: "Breakfast" },
  { id: "breakfast_one_meal", label: "Breakfast + One Meal" },
  { id: "all_meals", label: "All Meals" },
];

export const OCCUPANCY_TYPES = [
  { id: "single", label: "Single" },
  { id: "double", label: "Double" },
];

export const AVAILABLE_WITH_ROOM_PLAN = "Available with room plan";

export function mealPlanLabel(id) {
  return MEAL_PLANS.find((p) => p.id === id)?.label || id;
}

export function occupancyLabel(id) {
  return OCCUPANCY_TYPES.find((p) => p.id === id)?.label || id;
}

export async function listAdminTariffs({
  hotel_id,
  room_type_id,
  meal_plan,
  occupancy,
  status,
} = {}) {
  const params = new URLSearchParams();
  if (hotel_id) params.set("hotel_id", hotel_id);
  if (room_type_id) params.set("room_type_id", room_type_id);
  if (meal_plan) params.set("meal_plan", meal_plan);
  if (occupancy) params.set("occupancy", occupancy);
  if (status) params.set("status", status);
  const qs = params.toString();
  return adminApi(`/api/admin/tariffs${qs ? `?${qs}` : ""}`);
}

export async function getAdminTariff(id) {
  return adminApi(`/api/admin/tariffs/${encodeURIComponent(id)}`);
}

export async function createAdminTariff(payload) {
  return adminApi("/api/admin/tariffs", { method: "POST", body: payload });
}

export async function updateAdminTariff(id, payload) {
  return adminApi(`/api/admin/tariffs/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteAdminTariff(id) {
  return adminApi(`/api/admin/tariffs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getAdminTariffSettings(hotelId) {
  return adminApi(
    `/api/admin/tariffs/settings/${encodeURIComponent(hotelId)}`
  );
}

export async function updateAdminTariffSettings(hotelId, settings) {
  return adminApi(
    `/api/admin/tariffs/settings/${encodeURIComponent(hotelId)}`,
    { method: "PATCH", body: settings }
  );
}

export function emptyTariffForm() {
  return {
    hotel_id: "",
    room_type_id: "",
    meal_plan: "no_meal",
    occupancy: "single",
    price: "",
    display_note: "",
    valid_from: "",
    valid_to: "",
    status: "active",
    sort_order: "0",
  };
}

export function tariffToForm(row) {
  if (!row) return emptyTariffForm();
  return {
    hotel_id: row.hotel_id || "",
    room_type_id: row.room_type_id || "",
    meal_plan: row.meal_plan || "no_meal",
    occupancy: row.occupancy || "single",
    price:
      row.price === null || row.price === undefined ? "" : String(row.price),
    display_note: row.display_note || "",
    valid_from: row.valid_from ? String(row.valid_from).slice(0, 10) : "",
    valid_to: row.valid_to ? String(row.valid_to).slice(0, 10) : "",
    status: row.status || "active",
    sort_order:
      row.sort_order === null || row.sort_order === undefined
        ? "0"
        : String(row.sort_order),
  };
}

export function formToTariffPayload(form) {
  const payload = {
    hotel_id: String(form.hotel_id || "").trim(),
    meal_plan: form.meal_plan,
    occupancy: form.occupancy,
    status: form.status || "active",
    display_note: String(form.display_note || "").trim() || null,
    valid_from: String(form.valid_from || "").trim() || null,
    valid_to: String(form.valid_to || "").trim() || null,
  };

  const roomTypeId = String(form.room_type_id || "").trim();
  payload.room_type_id = roomTypeId || null;

  if (form.price === "" || form.price === null || form.price === undefined) {
    payload.price = null;
  } else {
    payload.price = Number(form.price);
  }

  if (form.sort_order === "" || form.sort_order === null) {
    payload.sort_order = 0;
  } else {
    payload.sort_order = Number(form.sort_order);
  }

  return payload;
}

export function validateTariffForm(form) {
  const fieldErrors = {};
  const errors = [];

  if (!String(form.hotel_id || "").trim()) {
    fieldErrors.hotel_id = "Hotel is required.";
  }

  if (!form.meal_plan) {
    fieldErrors.meal_plan = "Meal plan is required.";
  } else if (!MEAL_PLANS.some((p) => p.id === form.meal_plan)) {
    fieldErrors.meal_plan = "Invalid meal plan.";
  }

  if (!form.occupancy) {
    fieldErrors.occupancy = "Occupancy is required.";
  } else if (!OCCUPANCY_TYPES.some((p) => p.id === form.occupancy)) {
    fieldErrors.occupancy = "Invalid occupancy.";
  }

  if (form.price !== "" && form.price !== null && form.price !== undefined) {
    const n = Number(form.price);
    if (!Number.isFinite(n) || n < 0) {
      fieldErrors.price = "Price must be a number ≥ 0.";
    }
  }

  if (form.display_note && String(form.display_note).length > 255) {
    fieldErrors.display_note = "Display note must be at most 255 characters.";
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (form.valid_from && !datePattern.test(form.valid_from)) {
    fieldErrors.valid_from = "Use YYYY-MM-DD format.";
  }
  if (form.valid_to && !datePattern.test(form.valid_to)) {
    fieldErrors.valid_to = "Use YYYY-MM-DD format.";
  }
  if (
    form.valid_from &&
    form.valid_to &&
    datePattern.test(form.valid_from) &&
    datePattern.test(form.valid_to) &&
    form.valid_from > form.valid_to
  ) {
    fieldErrors.valid_to = "End date must be on or after start date.";
  }

  if (form.status && !TARIFF_STATUSES.includes(form.status)) {
    fieldErrors.status = `Status must be one of: ${TARIFF_STATUSES.join(", ")}.`;
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

export function emptyTariffSettingsForm() {
  return {
    note: "",
    extra_bed: "",
    gst: "",
    cancellation_policy: "",
    unavailable_label: AVAILABLE_WITH_ROOM_PLAN,
  };
}

export function settingsToForm(settings) {
  if (!settings) return emptyTariffSettingsForm();
  return {
    note: settings.note || "",
    extra_bed:
      settings.extra_bed === null || settings.extra_bed === undefined
        ? ""
        : String(settings.extra_bed),
    gst: settings.gst || "",
    cancellation_policy:
      settings.cancellation_policy || settings.cancellationPolicy || "",
    unavailable_label:
      settings.unavailable_label ||
      settings.unavailableLabel ||
      AVAILABLE_WITH_ROOM_PLAN,
  };
}

export function formToSettingsPayload(form) {
  const payload = {
    note: String(form.note || "").trim() || null,
    gst: String(form.gst || "").trim() || null,
    cancellation_policy: String(form.cancellation_policy || "").trim() || null,
    unavailable_label:
      String(form.unavailable_label || "").trim() || AVAILABLE_WITH_ROOM_PLAN,
  };

  if (form.extra_bed === "" || form.extra_bed === null) {
    payload.extra_bed = null;
  } else {
    payload.extra_bed = Number(form.extra_bed);
  }

  return payload;
}
