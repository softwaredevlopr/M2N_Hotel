const {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  BOOKING_SOURCES,
} = require("../utils/bookingConstants");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Deliberately permissive: 7–15 digits after stripping punctuation covers Indian
// 10-digit mobiles and international numbers with or without a country code.
const PHONE_DIGITS_MIN = 7;
const PHONE_DIGITS_MAX = 15;

const MAX_STAY_NIGHTS = 90;

function trimOrNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function phoneDigits(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "");
}

function isValidPhone(value) {
  const digits = phoneDigits(value);
  return digits.length >= PHONE_DIGITS_MIN && digits.length <= PHONE_DIGITS_MAX;
}

/** Comparable form for guest lookup: last 10 digits ignores +91 / 0 prefixes. */
function normalizePhoneForMatch(value) {
  const digits = phoneDigits(value);
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function parseUuid(value, field, errors, { required = true } = {}) {
  const raw = trimOrNull(value);
  if (raw === null) {
    if (required) errors.push(`${field} is required`);
    return null;
  }
  if (!UUID_REGEX.test(raw)) {
    errors.push(`${field} must be a valid UUID`);
    return null;
  }
  return raw;
}

function parseDate(value, field, errors, { required = true } = {}) {
  const raw = trimOrNull(value);
  if (raw === null) {
    if (required) errors.push(`${field} is required`);
    return null;
  }
  if (!ISO_DATE_REGEX.test(raw)) {
    errors.push(`${field} must be in YYYY-MM-DD format`);
    return null;
  }
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    errors.push(`${field} is not a valid calendar date`);
    return null;
  }
  // Rejects overflow dates such as 2026-02-31 that Date silently rolls forward.
  if (parsed.toISOString().slice(0, 10) !== raw) {
    errors.push(`${field} is not a valid calendar date`);
    return null;
  }
  return raw;
}

function parseInteger(value, field, errors, { min, max, fallback } = {}) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    errors.push(`${field} must be an integer`);
    return fallback;
  }
  if (min !== undefined && parsed < min) {
    errors.push(`${field} must be at least ${min}`);
    return fallback;
  }
  if (max !== undefined && parsed > max) {
    errors.push(`${field} must be at most ${max}`);
    return fallback;
  }
  return parsed;
}

function parseAmount(value, field, errors, { fallback = 0 } = {}) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    errors.push(`${field} must be a number >= 0`);
    return fallback;
  }
  return Math.round(parsed * 100) / 100;
}

function nightsBetween(checkIn, checkOut) {
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86400000);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Validates the shared guest/stay fields used by both the public and admin
 * create paths. `allowPastDates` is true for admin entry so staff can record
 * walk-ins and phone bookings retrospectively.
 */
function validateStayDates(checkIn, checkOut, errors, { allowPastDates } = {}) {
  if (!checkIn || !checkOut) return;

  if (nightsBetween(checkIn, checkOut) <= 0) {
    errors.push("check_out_date must be after check_in_date");
    return;
  }

  if (nightsBetween(checkIn, checkOut) > MAX_STAY_NIGHTS) {
    errors.push(`Stay cannot exceed ${MAX_STAY_NIGHTS} nights`);
  }

  if (!allowPastDates && checkIn < todayIsoDate()) {
    errors.push("check_in_date cannot be in the past");
  }
}

function validateGuestFields(body, errors, { partial = false } = {}) {
  const out = {};

  if (!partial || body.guest_name !== undefined) {
    const name = trimOrNull(body.guest_name);
    if (!name) errors.push("guest_name is required");
    else if (name.length < 2 || name.length > 150) {
      errors.push("guest_name must be between 2 and 150 characters");
    } else out.guest_name = name;
  }

  if (!partial || body.guest_email !== undefined) {
    const email = trimOrNull(body.guest_email);
    if (!email) errors.push("guest_email is required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      errors.push("guest_email must be a valid email");
    } else out.guest_email = email.toLowerCase();
  }

  if (!partial || body.guest_phone !== undefined) {
    const phone = trimOrNull(body.guest_phone);
    if (!phone) errors.push("guest_phone is required");
    else if (!isValidPhone(phone)) {
      errors.push(
        `guest_phone must contain ${PHONE_DIGITS_MIN}-${PHONE_DIGITS_MAX} digits`
      );
    } else if (phone.length > 50) {
      errors.push("guest_phone must be at most 50 characters");
    } else out.guest_phone = phone;
  }

  return out;
}

// Shape-level schemas for the shared validate middleware. Cross-field rules and
// domain checks live in the controllers so errors can be reported together.
const createBookingSchema = {
  body: {
    hotel_id: { required: true, type: "string", maxLength: 36 },
    room_type_id: { required: true, type: "string", maxLength: 36 },
    guest_name: { required: true, type: "string", minLength: 2, maxLength: 150 },
    guest_email: { required: true, type: "email", maxLength: 255 },
    guest_phone: { required: true, type: "string", minLength: 7, maxLength: 50 },
    check_in_date: { required: true, type: "string", maxLength: 10 },
    check_out_date: { required: true, type: "string", maxLength: 10 },
    adults: { type: "number" },
    children: { type: "number" },
    number_of_rooms: { type: "number" },
    special_requests: { type: "string", maxLength: 2000 },
  },
};

const lookupBookingSchema = {
  query: {
    email: { type: "string", maxLength: 255 },
    phone: { type: "string", maxLength: 50 },
  },
};

const availabilityQuerySchema = {
  query: {
    hotel_id: { type: "string", maxLength: 36 },
    hotel_slug: { type: "string", maxLength: 120 },
    room_type_id: { type: "string", maxLength: 36 },
    check_in_date: { type: "string", maxLength: 10 },
    check_out_date: { type: "string", maxLength: 10 },
    number_of_rooms: { type: "number" },
  },
};

const adminCreateBookingSchema = {
  body: {
    hotel_id: { required: true, type: "string", maxLength: 36 },
    room_type_id: { required: true, type: "string", maxLength: 36 },
    room_id: { type: "string", maxLength: 36 },
    guest_name: { required: true, type: "string", minLength: 2, maxLength: 150 },
    guest_email: { required: true, type: "email", maxLength: 255 },
    guest_phone: { required: true, type: "string", minLength: 7, maxLength: 50 },
    check_in_date: { required: true, type: "string", maxLength: 10 },
    check_out_date: { required: true, type: "string", maxLength: 10 },
    adults: { type: "number" },
    children: { type: "number" },
    number_of_rooms: { type: "number" },
    booking_source: { type: "string", enum: BOOKING_SOURCES },
    booking_status: { type: "string", enum: BOOKING_STATUSES },
    payment_status: { type: "string", enum: PAYMENT_STATUSES },
    special_requests: { type: "string", maxLength: 2000 },
    subtotal: { type: "number" },
    tax_amount: { type: "number" },
    total_amount: { type: "number" },
    currency: { type: "string", minLength: 3, maxLength: 3 },
  },
};

const updateBookingSchema = {
  body: {
    guest_name: { type: "string", minLength: 2, maxLength: 150 },
    guest_email: { type: "email", maxLength: 255 },
    guest_phone: { type: "string", minLength: 7, maxLength: 50 },
    room_type_id: { type: "string", maxLength: 36 },
    check_in_date: { type: "string", maxLength: 10 },
    check_out_date: { type: "string", maxLength: 10 },
    adults: { type: "number" },
    children: { type: "number" },
    number_of_rooms: { type: "number" },
    booking_source: { type: "string", enum: BOOKING_SOURCES },
    payment_status: { type: "string", enum: PAYMENT_STATUSES },
    special_requests: { type: "string", maxLength: 2000 },
    subtotal: { type: "number" },
    tax_amount: { type: "number" },
    total_amount: { type: "number" },
    currency: { type: "string", minLength: 3, maxLength: 3 },
  },
};

const updateBookingStatusSchema = {
  body: {
    booking_status: { type: "string", enum: BOOKING_STATUSES },
    payment_status: { type: "string", enum: PAYMENT_STATUSES },
    cancellation_reason: { type: "string", maxLength: 2000 },
  },
};

const assignRoomSchema = {
  body: {
    room_id: { type: "string", maxLength: 36 },
  },
};

module.exports = {
  UUID_REGEX,
  ISO_DATE_REGEX,
  MAX_STAY_NIGHTS,
  trimOrNull,
  isValidPhone,
  normalizePhoneForMatch,
  parseUuid,
  parseDate,
  parseInteger,
  parseAmount,
  nightsBetween,
  todayIsoDate,
  validateStayDates,
  validateGuestFields,
  createBookingSchema,
  lookupBookingSchema,
  availabilityQuerySchema,
  adminCreateBookingSchema,
  updateBookingSchema,
  updateBookingStatusSchema,
  assignRoomSchema,
};
