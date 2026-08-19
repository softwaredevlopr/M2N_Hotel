const { pool } = require("../config/db");
const { AppError } = require("../middleware/error.middleware");
const {
  fetchLedgerTotals,
  lockBookingForFinance,
  mapPaymentRow,
  roundMoney,
  syncBookingPaymentStatus,
} = require("./bookingFinanceShared");

const PAYMENT_SELECT = `
  id, hotel_id, booking_id, entry_type, payment_method, amount, currency,
  recorded_at, reference_code, notes, status, voided_at, void_reason,
  idempotency_key, external_provider, external_transaction_id,
  created_by_admin_id, created_at, updated_at
`;

async function listPayments({ hotelId, bookingId }) {
  const bookingCheck = await pool.query(
    `SELECT id FROM bookings WHERE id = $1 AND hotel_id = $2 LIMIT 1`,
    [bookingId, hotelId]
  );
  if (bookingCheck.rows.length === 0) {
    throw new AppError(`Booking not found: ${bookingId}`, 404);
  }

  const result = await pool.query(
    `SELECT ${PAYMENT_SELECT}
     FROM booking_payments
     WHERE hotel_id = $1 AND booking_id = $2
     ORDER BY recorded_at ASC, created_at ASC`,
    [hotelId, bookingId]
  );

  const summary = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN entry_type = 'payment' AND status = 'active' THEN amount ELSE 0 END), 0)::numeric AS active_payments,
       COALESCE(SUM(CASE WHEN entry_type = 'refund' AND status = 'active' THEN amount ELSE 0 END), 0)::numeric AS active_refunds
     FROM booking_payments
     WHERE hotel_id = $1 AND booking_id = $2`,
    [hotelId, bookingId]
  );

  const totals = summary.rows[0] || {};
  const activePayments = roundMoney(totals.active_payments || 0);
  const activeRefunds = roundMoney(totals.active_refunds || 0);

  return {
    data: result.rows.map(mapPaymentRow),
    summary: {
      active_payments: activePayments,
      active_refunds: activeRefunds,
      net_paid: roundMoney(activePayments - activeRefunds),
    },
  };
}

async function recordLedgerEntry({
  hotelId,
  bookingId,
  entryType,
  paymentMethod,
  amount,
  currency,
  recordedAt,
  referenceCode,
  notes,
  idempotencyKey,
  externalProvider,
  externalTransactionId,
  adminId,
}) {
  const normalizedAmount = roundMoney(amount);
  if (normalizedAmount <= 0) {
    throw new AppError("amount must be greater than 0", 400);
  }

  if (idempotencyKey) {
    const existing = await pool.query(
      `SELECT ${PAYMENT_SELECT}
       FROM booking_payments
       WHERE hotel_id = $1 AND idempotency_key = $2
       LIMIT 1`,
      [hotelId, idempotencyKey]
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      if (row.booking_id !== bookingId) {
        throw new AppError("idempotency_key already used for another booking", 409);
      }
      const sync = await pool.query(
        `SELECT payment_status FROM bookings WHERE id = $1 LIMIT 1`,
        [bookingId]
      );
      return {
        data: mapPaymentRow(row),
        payment_status: sync.rows[0]?.payment_status || null,
        idempotent: true,
      };
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const booking = await lockBookingForFinance(client, bookingId, hotelId);
    const bookingCurrency = String(booking.currency || "INR").trim().toUpperCase();
    const entryCurrency = String(currency || bookingCurrency).trim().toUpperCase();
    if (entryCurrency !== bookingCurrency) {
      throw new AppError(
        `currency must match booking currency (${bookingCurrency})`,
        400
      );
    }

    const { netPaid } = await fetchLedgerTotals(client, bookingId);
    if (entryType === "refund" && normalizedAmount > netPaid) {
      throw new AppError(
        `refund amount exceeds net collected (${netPaid.toFixed(2)})`,
        400
      );
    }

    const insert = await client.query(
      `INSERT INTO booking_payments (
         hotel_id, booking_id, entry_type, payment_method, amount, currency,
         recorded_at, reference_code, notes, idempotency_key,
         external_provider, external_transaction_id, created_by_admin_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()), $8, $9, $10, $11, $12, $13)
       RETURNING ${PAYMENT_SELECT}`,
      [
        hotelId,
        bookingId,
        entryType,
        paymentMethod,
        normalizedAmount,
        entryCurrency,
        recordedAt || null,
        referenceCode || null,
        notes || null,
        idempotencyKey || null,
        externalProvider || null,
        externalTransactionId || null,
        adminId || null,
      ]
    );

    const sync = await syncBookingPaymentStatus(client, bookingId);
    await client.query("COMMIT");

    return {
      data: mapPaymentRow(insert.rows[0]),
      payment_status: sync.payment_status,
      net_paid: sync.net_paid,
      billed_total: sync.billed_total,
      idempotent: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505" && idempotencyKey) {
      const replay = await pool.query(
        `SELECT ${PAYMENT_SELECT}
         FROM booking_payments
         WHERE hotel_id = $1 AND idempotency_key = $2
         LIMIT 1`,
        [hotelId, idempotencyKey]
      );
      if (replay.rows.length > 0) {
        const sync = await pool.query(
          `SELECT payment_status FROM bookings WHERE id = $1 LIMIT 1`,
          [bookingId]
        );
        return {
          data: mapPaymentRow(replay.rows[0]),
          payment_status: sync.rows[0]?.payment_status || null,
          idempotent: true,
        };
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

async function voidPaymentEntry({
  hotelId,
  bookingId,
  paymentId,
  voidReason,
  adminId: _adminId,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockBookingForFinance(client, bookingId, hotelId);

    const paymentResult = await client.query(
      `SELECT ${PAYMENT_SELECT}
       FROM booking_payments
       WHERE id = $1 AND booking_id = $2 AND hotel_id = $3
       FOR UPDATE`,
      [paymentId, bookingId, hotelId]
    );
    if (paymentResult.rows.length === 0) {
      throw new AppError(`Payment not found: ${paymentId}`, 404);
    }

    const payment = paymentResult.rows[0];
    if (payment.status === "void") {
      throw new AppError("Payment entry is already void", 409);
    }

    const updated = await client.query(
      `UPDATE booking_payments
       SET status = 'void', voided_at = NOW(), void_reason = $2
       WHERE id = $1
       RETURNING ${PAYMENT_SELECT}`,
      [paymentId, voidReason]
    );

    const sync = await syncBookingPaymentStatus(client, bookingId);
    await client.query("COMMIT");

    return {
      data: mapPaymentRow(updated.rows[0]),
      payment_status: sync.payment_status,
      net_paid: sync.net_paid,
      billed_total: sync.billed_total,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listPayments,
  recordLedgerEntry,
  voidPaymentEntry,
};
