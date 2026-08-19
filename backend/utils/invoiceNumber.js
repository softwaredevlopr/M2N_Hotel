const INVOICE_PREFIX_STOP_SEGMENTS = new Set(["m2n", "hotel"]);

/**
 * Derive a short hotel code for invoice numbers from slug segments.
 * Examples: m2n-hotel-aurelia-grand → AG, hotel-zaarang-inn → ZI.
 */
function deriveHotelInvoiceCode(slug, metadata) {
  const override =
    metadata &&
    typeof metadata === "object" &&
    typeof metadata.invoice_prefix === "string"
      ? metadata.invoice_prefix.trim()
      : "";
  if (override) {
    return override.toUpperCase().slice(0, 10);
  }

  const segments = String(slug || "")
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !INVOICE_PREFIX_STOP_SEGMENTS.has(part.toLowerCase()));

  if (segments.length === 0) {
    return String(slug || "XX")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "XX";
  }
  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }

  const lastTwo = segments.slice(-2);
  return lastTwo.map((part) => part[0].toUpperCase()).join("");
}

function formatInvoiceNumber(hotelCode, year, sequence) {
  const code = String(hotelCode || "XX").toUpperCase();
  const seq = String(sequence).padStart(6, "0");
  return `${code}-${year}-${seq}`;
}

function draftInvoicePlaceholder() {
  const token = Math.random().toString(16).slice(2, 10).toUpperCase();
  return `DRAFT-${token}`;
}

module.exports = {
  deriveHotelInvoiceCode,
  formatInvoiceNumber,
  draftInvoicePlaceholder,
};
