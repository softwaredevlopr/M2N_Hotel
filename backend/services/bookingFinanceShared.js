const { AppError } = require("../middleware/error.middleware");
const { PAYMENT_STATUSES } = require("../utils/bookingConstants");

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function computePaymentStatus({ netPaid, activePayments, activeRefunds, billedTotal }) {
  const net = roundMoney(netPaid);
  const billed = roundMoney(billedTotal);
  const payments = roundMoney(activePayments);
  const refunds = roundMoney(activeRefunds);

  if (billed <= 0) {
    return "unpaid";
  }

  if (net <= 0) {
    if (payments > 0 || refunds > 0) {
      return "refunded";
    }
    return "unpaid";
  }

  if (net >= billed) {
    return "paid";
  }

  return "partial";
}

async function fetchLedgerTotals(client, bookingId) {
  const result = await client.query(
    `SELECT
       COALESCE(SUM(CASE WHEN entry_type = 'payment' AND status = 'active' THEN amount ELSE 0 END), 0)::numeric AS active_payments,
       COALESCE(SUM(CASE WHEN entry_type = 'refund' AND status = 'active' THEN amount ELSE 0 END), 0)::numeric AS active_refunds
     FROM booking_payments
     WHERE booking_id = $1`,
    [bookingId]
  );

  const row = result.rows[0] || {};
  const activePayments = roundMoney(row.active_payments || 0);
  const activeRefunds = roundMoney(row.active_refunds || 0);
  const netPaid = roundMoney(activePayments - activeRefunds);

  return { activePayments, activeRefunds, netPaid };
}

async function fetchBilledTotal(client, bookingId) {
  const issued = await client.query(
    `SELECT total_amount
     FROM booking_invoices
     WHERE booking_id = $1 AND status = 'issued'
     ORDER BY issued_at DESC
     LIMIT 1`,
    [bookingId]
  );
  if (issued.rows.length > 0) {
    return roundMoney(issued.rows[0].total_amount);
  }

  const booking = await client.query(
    `SELECT total_amount FROM bookings WHERE id = $1 LIMIT 1`,
    [bookingId]
  );
  if (booking.rows.length === 0) {
    throw new AppError("Booking not found", 404);
  }
  return roundMoney(booking.rows[0].total_amount || 0);
}

async function syncBookingPaymentStatus(client, bookingId) {
  const { activePayments, activeRefunds, netPaid } = await fetchLedgerTotals(
    client,
    bookingId
  );
  const billedTotal = await fetchBilledTotal(client, bookingId);
  const paymentStatus = computePaymentStatus({
    netPaid,
    activePayments,
    activeRefunds,
    billedTotal,
  });

  if (!PAYMENT_STATUSES.includes(paymentStatus)) {
    throw new AppError("Computed invalid payment_status", 500);
  }

  const updated = await client.query(
    `UPDATE bookings
     SET payment_status = $2
     WHERE id = $1
     RETURNING payment_status`,
    [bookingId, paymentStatus]
  );

  return {
    payment_status: updated.rows[0]?.payment_status || paymentStatus,
    net_paid: netPaid,
    billed_total: billedTotal,
    active_payments: activePayments,
    active_refunds: activeRefunds,
  };
}

async function lockBookingForFinance(client, bookingId, hotelId) {
  const result = await client.query(
    `SELECT id, hotel_id, booking_number, guest_name, guest_email, guest_phone,
            check_in_date, check_out_date, adults, children, number_of_rooms,
            subtotal, tax_amount, total_amount, currency, room_type_id,
            payment_status
     FROM bookings
     WHERE id = $1
     FOR UPDATE`,
    [bookingId]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Booking not found: ${bookingId}`, 404);
  }

  const booking = result.rows[0];
  if (booking.hotel_id !== hotelId) {
    throw new AppError("hotel_id mismatch for booking", 400);
  }

  return booking;
}

function mapPaymentRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    hotel_id: row.hotel_id,
    booking_id: row.booking_id,
    entry_type: row.entry_type,
    payment_method: row.payment_method,
    amount: roundMoney(row.amount),
    currency: row.currency,
    recorded_at: row.recorded_at,
    reference_code: row.reference_code,
    notes: row.notes,
    status: row.status,
    voided_at: row.voided_at,
    void_reason: row.void_reason,
    idempotency_key: row.idempotency_key,
    external_provider: row.external_provider,
    external_transaction_id: row.external_transaction_id,
    created_by_admin_id: row.created_by_admin_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapInvoiceRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    hotel_id: row.hotel_id,
    booking_id: row.booking_id,
    invoice_number: row.invoice_number,
    status: row.status,
    replaces_invoice_id: row.replaces_invoice_id,
    issued_at: row.issued_at,
    voided_at: row.voided_at,
    void_reason: row.void_reason,
    subtotal: roundMoney(row.subtotal),
    tax_amount: roundMoney(row.tax_amount),
    total_amount: roundMoney(row.total_amount),
    currency: row.currency,
    tax_rate_label: row.tax_rate_label,
    tax_rate_percent:
      row.tax_rate_percent === null || row.tax_rate_percent === undefined
        ? null
        : roundMoney(row.tax_rate_percent),
    seller_name: row.seller_name,
    seller_email: row.seller_email,
    seller_phone: row.seller_phone,
    seller_address_line1: row.seller_address_line1,
    seller_address_line2: row.seller_address_line2,
    seller_city: row.seller_city,
    seller_state: row.seller_state,
    seller_country: row.seller_country,
    seller_postal_code: row.seller_postal_code,
    seller_gstin: row.seller_gstin,
    seller_pan: row.seller_pan,
    buyer_name: row.buyer_name,
    buyer_email: row.buyer_email,
    buyer_phone: row.buyer_phone,
    buyer_gstin: row.buyer_gstin,
    booking_number: row.booking_number,
    check_in_date: row.check_in_date,
    check_out_date: row.check_out_date,
    nights: row.nights,
    room_type_name: row.room_type_name,
    number_of_rooms: row.number_of_rooms,
    adults: row.adults,
    children: row.children,
    line_description: row.line_description,
    hsn_sac: row.hsn_sac,
    place_of_supply: row.place_of_supply,
    notes: row.notes,
    created_by_admin_id: row.created_by_admin_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  roundMoney,
  computePaymentStatus,
  fetchLedgerTotals,
  fetchBilledTotal,
  syncBookingPaymentStatus,
  lockBookingForFinance,
  mapPaymentRow,
  mapInvoiceRow,
};
