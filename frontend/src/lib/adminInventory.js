import { adminApi, formatApiError } from "@/lib/adminHotels";

export { formatApiError, adminApi };

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
  (roomTypes || []).forEach((rt) => {
    const day = (rt.days || []).find((d) => d.date === isoDate);
    if (!day) return;
    total += Number(day.total_rooms) || 0;
    sold += Number(day.sold_count) || 0;
  });
  const remaining = Math.max(total - sold, 0);
  return {
    date: isoDate,
    total_rooms: total,
    sold_count: sold,
    booked_rooms: sold,
    remaining_count: remaining,
    available_rooms: remaining,
    is_sold_out: total === 0 || remaining === 0,
  };
}

/**
 * Green = available, Yellow = low, Red = sold out.
 * Low = remaining > 0 and remaining/total <= 25% (or remaining === 1 when total > 1).
 */
export function inventoryTone(day) {
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
