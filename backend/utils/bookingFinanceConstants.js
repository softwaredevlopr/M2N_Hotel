// Phase 14 Lite financial domain constants — mirror CHECK constraints in
// migrations/008_booking_payments_and_invoices.sql.

const PAYMENT_ENTRY_TYPES = ["payment", "refund"];

const PAYMENT_METHODS = ["cash", "card", "upi", "bank_transfer", "other"];

const LEDGER_STATUSES = ["active", "void"];

const INVOICE_STATUSES = ["draft", "issued", "void"];

const GSTIN_REGEX = /^[0-9A-Z]{15}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

module.exports = {
  PAYMENT_ENTRY_TYPES,
  PAYMENT_METHODS,
  LEDGER_STATUSES,
  INVOICE_STATUSES,
  GSTIN_REGEX,
  PAN_REGEX,
};
