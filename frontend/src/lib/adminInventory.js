import { adminApi, formatApiError } from "@/lib/adminHotels";

export { formatApiError, adminApi };

export const INVENTORY_DATE_SOURCES = ["manual", "system", "ota", "channel"];
export const SMALLINT_MAX = 32767;

/**
 * Admin inventory calendar — GET /api/admin/inventory/calendar
 * Query: hotel_id, from, to, optional room_type_id
 */
export async function getAdminInventoryCalendar({
  hotel_id,
  hotel_slug,
  from,
  to,
  room_type_id,
} = {}) {
  const params = new URLSearchParams();
  if (hotel_id) params.set("hotel_id", hotel_id);
  if (hotel_slug) params.set("hotel_slug", hotel_slug);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (room_type_id) params.set("room_type_id", room_type_id);
  const qs = params.toString();
  return adminApi(`/api/admin/inventory/calendar${qs ? `?${qs}` : ""}`);
}

/**
 * Admin single-day inventory — GET /api/admin/inventory/day
 */
export async function getAdminInventoryDay({
  hotel_id,
  room_type_id,
  date,
} = {}) {
  const params = new URLSearchParams();
  if (hotel_id) params.set("hotel_id", hotel_id);
  if (room_type_id) params.set("room_type_id", room_type_id);
  if (date) params.set("date", date);
  return adminApi(`/api/admin/inventory/day?${params.toString()}`);
}

/**
 * Upsert inventory-date override — PUT /api/admin/inventory/dates
 */
export async function upsertAdminInventoryDate(payload) {
  return adminApi("/api/admin/inventory/dates", {
    method: "PUT",
    body: payload,
  });
}

/**
 * Clear inventory-date override — DELETE /api/admin/inventory/dates
 */
export async function deleteAdminInventoryDate({
  hotel_id,
  room_type_id,
  inventory_date,
} = {}) {
  const params = new URLSearchParams();
  if (hotel_id) params.set("hotel_id", hotel_id);
  if (room_type_id) params.set("room_type_id", room_type_id);
  if (inventory_date) params.set("inventory_date", inventory_date);
  return adminApi(`/api/admin/inventory/dates?${params.toString()}`, {
    method: "DELETE",
  });
}

export function monthBounds(year, monthIndex) {
  const from = new Date(Date.UTC(year, monthIndex, 1));
  const to = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    daysInMonth: to.getUTCDate(),
  };
}

export function shiftMonth(year, monthIndex, delta) {
  const date = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() };
}

export function monthLabel(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Aggregate day rows across room types for a given ISO date.
 */
export function aggregateDay(roomTypes, isoDate) {
  let total = 0;
  let sold = 0;
  let anyStopSell = false;
  (roomTypes || []).forEach((rt) => {
    const day = (rt.days || []).find((d) => d.date === isoDate);
    if (!day) return;
    total += Number(day.total_rooms) || 0;
    sold += Number(day.sold_count) || 0;
    if (day.stop_sell) anyStopSell = true;
  });
  const remaining = Math.max(total - sold, 0);
  return {
    date: isoDate,
    total_rooms: total,
    sold_count: sold,
    booked_rooms: sold,
    remaining_count: remaining,
    available_rooms: remaining,
    is_sold_out: anyStopSell || total === 0 || remaining === 0,
    stop_sell: anyStopSell,
    allotment: null,
    overbooking_allowance: 0,
    has_override: false,
    override_id: null,
    source: null,
    aggregated: true,
  };
}

/**
 * True when a persisted override row exists (including defaults-only rows).
 */
export function dayHasPersistedOverride(day) {
  if (!day || day.aggregated) return false;
  return Boolean(day.has_override);
}

/**
 * True when persisted values differ from sparse defaults
 * (null allotment, stop_sell false, overbooking 0).
 */
export function dayHasCustomOverrideValues(day) {
  if (!dayHasPersistedOverride(day)) return false;
  if (day.allotment !== null && day.allotment !== undefined) return true;
  if (day.stop_sell) return true;
  if (Number(day.overbooking_allowance) > 0) return true;
  return false;
}

/**
 * @deprecated Prefer dayHasPersistedOverride / dayHasCustomOverrideValues.
 */
export function dayLooksOverridden(day) {
  return dayHasCustomOverrideValues(day);
}

/**
 * Green = available, Yellow = low, Red = sold out / stop-sell.
 */
export function inventoryTone(day) {
  if (day?.stop_sell) return "sold_out";
  const total = Number(day?.total_rooms) || 0;
  const remaining = Number(day?.remaining_count) || 0;
  if (total <= 0 || remaining <= 0 || day?.is_sold_out) return "sold_out";
  if (remaining === 1 || remaining / total <= 0.25) return "low";
  return "available";
}

export function occupancyPct(day) {
  const total = Number(day?.total_rooms) || 0;
  const sold = Number(day?.sold_count) || 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((sold / total) * 100));
}

export const TONE_STYLES = {
  available:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400/60",
  low: "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:border-amber-400/60",
  sold_out:
    "border-rose-500/40 bg-rose-500/10 text-rose-100 hover:border-rose-400/60",
};

export const TONE_LABELS = {
  available: "Available",
  low: "Low inventory",
  sold_out: "Sold out",
};

/**
 * Client-side validation aligned with admin inventory-date write API.
 * Returns { ok, errors, payload }.
 */
export function validateInventoryDateForm(form) {
  const errors = {};
  const allotmentRaw =
    form.allotment === "" ||
    form.allotment === null ||
    form.allotment === undefined
      ? null
      : Number(form.allotment);
  if (allotmentRaw !== null) {
    if (!Number.isInteger(allotmentRaw)) {
      errors.allotment = "Allotment must be a whole number.";
    } else if (allotmentRaw < 0) {
      errors.allotment = "Allotment cannot be negative.";
    } else if (allotmentRaw > SMALLINT_MAX) {
      errors.allotment = `Allotment must be at most ${SMALLINT_MAX}.`;
    }
  }

  const overRaw =
    form.overbooking_allowance === "" ||
    form.overbooking_allowance === null ||
    form.overbooking_allowance === undefined
      ? 0
      : Number(form.overbooking_allowance);
  if (!Number.isInteger(overRaw)) {
    errors.overbooking_allowance =
      "Overbooking allowance must be a whole number.";
  } else if (overRaw < 0) {
    errors.overbooking_allowance =
      "Overbooking allowance cannot be negative.";
  } else if (overRaw > SMALLINT_MAX) {
    errors.overbooking_allowance = `Overbooking allowance must be at most ${SMALLINT_MAX}.`;
  }

  const source = form.source || "manual";
  if (!INVENTORY_DATE_SOURCES.includes(source)) {
    errors.source = `Source must be one of: ${INVENTORY_DATE_SOURCES.join(", ")}.`;
  }

  if (typeof form.stop_sell !== "boolean") {
    errors.stop_sell = "Stop-sell must be on or off.";
  }

  const payload = {
    hotel_id: form.hotel_id,
    room_type_id: form.room_type_id,
    inventory_date: form.inventory_date,
    allotment: allotmentRaw,
    stop_sell: Boolean(form.stop_sell),
    overbooking_allowance: Number.isInteger(overRaw) ? overRaw : 0,
    source,
  };

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    payload,
  };
}
