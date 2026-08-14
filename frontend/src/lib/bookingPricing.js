// Booking rules mirrored from the backend so the guest sees the same numbers and
// limits the API will enforce. Keep in sync with:
//   backend/validators/booking.validator.js  (limits, date rules)
//   backend/controllers/booking.controller.js (buildIndicativeAmounts)
//   backend/utils/bookingConstants.js         (SELLABLE_ROOM_STATUSES)

export const MAX_STAY_NIGHTS = 90;
export const MAX_ADULTS = 30;
export const MAX_CHILDREN = 30;
export const MAX_ROOMS = 20;

const SELLABLE_ROOM_STATUSES = ["available", "occupied"];

const MS_PER_DAY = 86400000;

export function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

export function addDays(isoDate, days) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / MS_PER_DAY);
}

export function formatStayDate(isoDate) {
  if (!isoDate) return "—";
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Rooms of a type the property can actually sell, matching backend inventory. */
export function countSellableRooms(rooms, roomTypeSlug) {
  if (!Array.isArray(rooms) || !roomTypeSlug) return 0;
  return rooms.filter(
    (room) =>
      room?.room_type_slug === roomTypeSlug &&
      SELLABLE_ROOM_STATUSES.includes(room?.status)
  ).length;
}

/**
 * True when adults + children exceed the room type's per-room max occupancy
 * times the number of rooms. Missing occupancy is treated as unrestricted.
 */
export function occupancyExceeded({
  adults,
  children,
  rooms,
  maxOccupancy,
} = {}) {
  const cap = Number(maxOccupancy);
  const roomCount = Number(rooms) || 1;
  if (!Number.isFinite(cap) || cap <= 0 || !Number.isFinite(roomCount)) {
    return false;
  }
  const guests = Number(adults) + Number(children);
  if (!Number.isFinite(guests)) return false;
  return guests > cap * roomCount;
}

/**
 * Indicative stay total. Mirrors the server calculation exactly: nightly base
 * price × nights × rooms, with no tax component. A room type without a published
 * base price is quoted on request rather than shown as a placeholder number.
 */
export function calculateStayTotals({ basePrice, nights, rooms }) {
  const nightlyRate = Number(basePrice);
  const stayNights = Number(nights);
  const roomCount = Number(rooms);

  const quotable =
    Number.isFinite(nightlyRate) &&
    nightlyRate > 0 &&
    stayNights > 0 &&
    roomCount > 0;

  if (!quotable) {
    return {
      onRequest: true,
      nightlyRate: null,
      nights: stayNights > 0 ? stayNights : 0,
      rooms: roomCount > 0 ? roomCount : 0,
      subtotal: 0,
      total: 0,
    };
  }

  const subtotal = Math.round(nightlyRate * stayNights * roomCount * 100) / 100;

  return {
    onRequest: false,
    nightlyRate,
    nights: stayNights,
    rooms: roomCount,
    subtotal,
    total: subtotal,
  };
}

/** Hotel-level tax/extra-bed notes captured in Phase 9 tariff settings. */
export function getTariffSettings(hotel) {
  const settings = hotel?.metadata?.tariff_settings;
  return settings && typeof settings === "object" ? settings : {};
}

/**
 * Lowest published nightly rate across the hotel's meal-plan matrix. Used only
 * as guidance when a room type has no base price to quote from — the booking
 * itself is still recorded as "on request" in that case.
 */
export function lowestPublishedRate(tariff) {
  if (!tariff || !Array.isArray(tariff.mealPlans)) return null;

  const rates = tariff.mealPlans
    .flatMap((plan) => [Number(plan?.single), Number(plan?.double)])
    .filter((rate) => Number.isFinite(rate) && rate > 0);

  return rates.length > 0 ? Math.min(...rates) : null;
}
