import { adminApi, formatApiError } from "@/lib/adminHotels";

export { formatApiError };

export const PAYMENT_ENTRY_TYPES = ["payment", "refund"];

export const PAYMENT_METHODS = [
  "cash",
  "card",
  "upi",
  "bank_transfer",
  "other",
];

export const PAYMENT_METHOD_LABELS = {
  cash: "Cash",
  card: "Card",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  other: "Other / manual",
};

export function formatMoneyAmount(value, currency = "INR") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${currency || "INR"} ${numeric.toFixed(2)}`;
  }
}

function withHotelQuery(path, hotelId) {
  const params = new URLSearchParams();
  params.set("hotel_id", hotelId);
  return `${path}?${params.toString()}`;
}

export async function listBookingPayments(bookingId, hotelId) {
  return adminApi(
    withHotelQuery(
      `/api/admin/bookings/${encodeURIComponent(bookingId)}/payments`,
      hotelId
    )
  );
}

export async function recordBookingPayment(bookingId, hotelId, payload) {
  return adminApi(
    withHotelQuery(
      `/api/admin/bookings/${encodeURIComponent(bookingId)}/payments`,
      hotelId
    ),
    { method: "POST", body: payload }
  );
}

export async function voidBookingPayment(bookingId, hotelId, paymentId, payload) {
  return adminApi(
    withHotelQuery(
      `/api/admin/bookings/${encodeURIComponent(bookingId)}/payments/${encodeURIComponent(paymentId)}/void`,
      hotelId
    ),
    { method: "POST", body: payload }
  );
}

export async function listBookingInvoices(bookingId, hotelId) {
  return adminApi(
    withHotelQuery(
      `/api/admin/bookings/${encodeURIComponent(bookingId)}/invoices`,
      hotelId
    )
  );
}

export async function createBookingInvoiceDraft(bookingId, hotelId, payload = {}) {
  return adminApi(
    withHotelQuery(
      `/api/admin/bookings/${encodeURIComponent(bookingId)}/invoices`,
      hotelId
    ),
    { method: "POST", body: payload }
  );
}

export async function issueBookingInvoice(bookingId, hotelId, invoiceId, payload = {}) {
  return adminApi(
    withHotelQuery(
      `/api/admin/bookings/${encodeURIComponent(bookingId)}/invoices/${encodeURIComponent(invoiceId)}/issue`,
      hotelId
    ),
    { method: "POST", body: payload }
  );
}

export async function voidBookingInvoice(bookingId, hotelId, invoiceId, payload) {
  return adminApi(
    withHotelQuery(
      `/api/admin/bookings/${encodeURIComponent(bookingId)}/invoices/${encodeURIComponent(invoiceId)}/void`,
      hotelId
    ),
    { method: "POST", body: payload }
  );
}

export function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

/**
 * Derive billed total and outstanding from booking + issued invoice + ledger
 * summary, matching ADR-0041 billed-total rules.
 */
export function deriveFinanceSummary({
  bookingTotal,
  issuedInvoiceTotal,
  activePayments = 0,
  activeRefunds = 0,
  netPaid,
}) {
  const billed =
    issuedInvoiceTotal != null && Number.isFinite(Number(issuedInvoiceTotal))
      ? roundMoney(issuedInvoiceTotal)
      : roundMoney(bookingTotal || 0);
  const payments = roundMoney(activePayments || 0);
  const refunds = roundMoney(activeRefunds || 0);
  const net =
    netPaid != null && Number.isFinite(Number(netPaid))
      ? roundMoney(netPaid)
      : roundMoney(payments - refunds);
  const outstanding = roundMoney(Math.max(0, billed - net));
  return {
    billed_total: billed,
    active_payments: payments,
    active_refunds: refunds,
    net_paid: net,
    outstanding,
  };
}
