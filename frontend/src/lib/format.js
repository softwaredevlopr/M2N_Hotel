export function formatPrice(value, currencyCode = "INR") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";

  if (currencyCode === "INR") {
    return `₹${numeric.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${currencyCode} ${numeric.toLocaleString("en-IN")}`;
  }
}

export function formatTimeOfDay(hms) {
  if (!hms || typeof hms !== "string") return "";
  const [hourPart, minutePart] = hms.split(":");
  const hour = Number(hourPart);
  const minute = minutePart ?? "00";
  if (!Number.isFinite(hour)) return hms;

  const period = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${minute} ${period}`;
}

export function formatAddress(hotel) {
  if (!hotel) return "";
  const parts = [
    hotel.address_line1,
    hotel.address_line2,
    hotel.city,
    hotel.state,
    hotel.postal_code,
    hotel.country,
  ].filter((part) => typeof part === "string" && part.trim().length > 0);
  return parts.join(", ");
}

export function formatShortAddress(hotel) {
  if (!hotel) return "";
  const parts = [
    hotel.address_line1,
    hotel.city,
    hotel.state,
    hotel.postal_code,
    hotel.country,
  ].filter((part) => typeof part === "string" && part.trim().length > 0);
  return parts.join(", ");
}

export function formatLocation(hotel) {
  if (!hotel) return "";
  const parts = [hotel.city, hotel.state, hotel.country].filter(
    (part) => typeof part === "string" && part.trim().length > 0
  );
  return parts.join(", ");
}

const PHONE_PLACEHOLDER = "+91 XXXX XXXXX";

export function isPlaceholderPhone(phone) {
  if (!phone || typeof phone !== "string") return true;
  const value = phone.trim();
  if (value.length === 0) return true;
  if (/todo/i.test(value)) return true;
  if (/x{3,}/i.test(value)) return true;
  return false;
}

export function formatPhoneDisplay(phone) {
  return isPlaceholderPhone(phone) ? PHONE_PLACEHOLDER : phone.trim();
}

export function phoneHref(phone) {
  if (isPlaceholderPhone(phone)) return null;
  return `tel:${phone.replace(/\s+/g, "")}`;
}

export function padNumber(value, width = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value ?? "");
  return String(numeric).padStart(width, "0");
}
