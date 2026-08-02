const crypto = require("crypto");

// Ambiguous characters (0/O, 1/I/L) are excluded so guests can read a booking
// reference over the phone without transcription errors.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SUFFIX_LENGTH = 5;
const DEFAULT_PREFIX = "M2N";

function randomSuffix(length = SUFFIX_LENGTH) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return out;
}

function datePart(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Human-readable booking reference, e.g. M2N-20260802-K7QRD.
 * Uniqueness is ultimately guaranteed by bookings_booking_number_unique;
 * callers should retry on a unique-violation.
 */
function generateBookingNumber({ prefix = DEFAULT_PREFIX, date } = {}) {
  const safePrefix = String(prefix || DEFAULT_PREFIX)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6) || DEFAULT_PREFIX;

  return `${safePrefix}-${datePart(date)}-${randomSuffix()}`;
}

module.exports = {
  generateBookingNumber,
  BOOKING_NUMBER_PREFIX: DEFAULT_PREFIX,
};
