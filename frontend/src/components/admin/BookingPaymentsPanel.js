"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { clearAdminSession } from "@/lib/adminAuth";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  deriveFinanceSummary,
  formatApiError,
  formatMoneyAmount,
  listBookingPayments,
  recordBookingPayment,
  voidBookingPayment,
} from "@/lib/adminBookingFinance";

const inputClass =
  "mt-2 w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none disabled:opacity-60";

function formatWhen(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingPaymentsPanel({
  bookingId,
  hotelId,
  currency = "INR",
  bookingTotal = 0,
  paymentStatus,
  issuedInvoiceTotal = null,
  onFinanceChange,
}) {
  const toast = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    active_payments: 0,
    active_refunds: 0,
    net_paid: 0,
  });

  const [entryType, setEntryType] = useState("payment");
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");

  const load = useCallback(async () => {
    if (!bookingId || !hotelId) return;
    setLoading(true);
    const result = await listBookingPayments(bookingId, hotelId);
    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      setError(formatApiError(result, "Unable to load payments."));
      setRows([]);
      setLoading(false);
      return;
    }
    setRows(result.data?.data || []);
    setSummary(
      result.data?.summary || {
        active_payments: 0,
        active_refunds: 0,
        net_paid: 0,
      }
    );
    setError("");
    setLoading(false);
  }, [bookingId, hotelId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const derived = useMemo(
    () =>
      deriveFinanceSummary({
        bookingTotal,
        issuedInvoiceTotal,
        activePayments: summary.active_payments,
        activeRefunds: summary.active_refunds,
        netPaid: summary.net_paid,
      }),
    [bookingTotal, issuedInvoiceTotal, summary]
  );

  async function submitLedger(e) {
    e.preventDefault();
    const errors = {};
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      errors.amount = "Enter an amount greater than 0.";
    }
    if (!PAYMENT_METHODS.includes(method)) {
      errors.payment_method = "Select a payment method.";
    }
    if (String(notes || "").length > 2000) {
      errors.notes = "Notes must be at most 2000 characters.";
    }
    if (String(reference || "").length > 120) {
      errors.reference_code = "Reference must be at most 120 characters.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBusy(true);
    const result = await recordBookingPayment(bookingId, hotelId, {
      entry_type: entryType,
      payment_method: method,
      amount: Math.round(parsedAmount * 100) / 100,
      currency,
      reference_code: String(reference || "").trim() || undefined,
      notes: String(notes || "").trim() || undefined,
    });
    setBusy(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to record ledger entry."));
      return;
    }

    toast.success(
      entryType === "refund" ? "Refund recorded." : "Payment recorded."
    );
    setAmount("");
    setReference("");
    setNotes("");
    setFieldErrors({});
    await load();
    if (onFinanceChange) {
      await onFinanceChange({
        payment_status: result.data?.payment_status,
      });
    }
  }

  async function confirmVoid() {
    if (!voidTarget) return;
    const reason = String(voidReason || "").trim();
    if (!reason) {
      toast.error("A void reason is required.");
      return;
    }
    setBusy(true);
    const result = await voidBookingPayment(
      bookingId,
      hotelId,
      voidTarget.id,
      { void_reason: reason }
    );
    setBusy(false);
    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to void payment."));
      return;
    }
    toast.success("Ledger entry voided.");
    setVoidTarget(null);
    setVoidReason("");
    await load();
    if (onFinanceChange) {
      await onFinanceChange({
        payment_status: result.data?.payment_status,
      });
    }
  }

  return (
    <section className="border border-ink-line bg-ink-soft p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[11px] tracking-[0.25em] uppercase text-gold">
            Payments
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-cream-muted">
            Manual ledger only — cash, card terminal, UPI, or bank transfer
            references. No card numbers are collected or stored.
          </p>
        </div>
        <StatusBadge status={paymentStatus} />
      </div>

      {loading ? (
        <p className="mt-6 inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading payments…
        </p>
      ) : error ? (
        <p role="alert" className="mt-6 text-sm text-gold">
          {error}
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              ["Booking / billed", derived.billed_total],
              ["Collected", derived.active_payments],
              ["Refunded", derived.active_refunds],
              ["Net paid", derived.net_paid],
              ["Outstanding", derived.outstanding],
            ].map(([label, value]) => (
              <div
                key={label}
                className="border border-ink-line bg-ink/40 px-3 py-3"
              >
                <div className="text-[10px] tracking-[0.2em] uppercase text-cream-muted">
                  {label}
                </div>
                <div className="mt-2 text-sm text-cream">
                  {formatMoneyAmount(value, currency)}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={submitLedger} className="mt-8 border-t border-ink-line pt-6">
            <h3 className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
              Record ledger entry
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                  Type *
                </label>
                <select
                  value={entryType}
                  disabled={busy}
                  onChange={(e) => setEntryType(e.target.value)}
                  className={inputClass}
                >
                  <option value="payment">Payment</option>
                  <option value="refund">Refund</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                  Method *
                </label>
                <select
                  value={method}
                  disabled={busy}
                  onChange={(e) => setMethod(e.target.value)}
                  className={inputClass}
                >
                  {PAYMENT_METHODS.map((value) => (
                    <option key={value} value={value}>
                      {PAYMENT_METHOD_LABELS[value]}
                    </option>
                  ))}
                </select>
                {fieldErrors.payment_method && (
                  <p className="mt-1 text-xs text-gold">
                    {fieldErrors.payment_method}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                  Amount *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  disabled={busy}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
                {fieldErrors.amount && (
                  <p className="mt-1 text-xs text-gold">{fieldErrors.amount}</p>
                )}
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                  Reference / txn #
                </label>
                <input
                  type="text"
                  value={reference}
                  disabled={busy}
                  maxLength={120}
                  onChange={(e) => setReference(e.target.value)}
                  className={inputClass}
                  placeholder="UPI / bank / auth ref"
                />
                {fieldErrors.reference_code && (
                  <p className="mt-1 text-xs text-gold">
                    {fieldErrors.reference_code}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                disabled={busy}
                maxLength={2000}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputClass} resize-y`}
                placeholder="Optional staff note"
              />
              {fieldErrors.notes && (
                <p className="mt-1 text-xs text-gold">{fieldErrors.notes}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={busy}
              className="mt-4 inline-flex items-center justify-center bg-gold px-5 py-3 text-[11px] tracking-[0.2em] uppercase text-cream hover:bg-gold-soft disabled:opacity-50"
            >
              {busy
                ? "Saving…"
                : entryType === "refund"
                  ? "Record refund"
                  : "Record payment"}
            </button>
          </form>

          <div className="mt-8 border-t border-ink-line pt-6">
            <h3 className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
              Ledger history
            </h3>
            {rows.length === 0 ? (
              <p className="mt-4 text-sm text-cream-muted">
                No payment or refund entries yet.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-line text-[10px] tracking-[0.2em] uppercase text-cream-muted">
                      <th className="py-2 pr-4 font-normal">When</th>
                      <th className="py-2 pr-4 font-normal">Type</th>
                      <th className="py-2 pr-4 font-normal">Method</th>
                      <th className="py-2 pr-4 font-normal">Amount</th>
                      <th className="py-2 pr-4 font-normal">Reference</th>
                      <th className="py-2 pr-4 font-normal">Status</th>
                      <th className="py-2 font-normal">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-ink-line/70 align-top"
                      >
                        <td className="py-3 pr-4 text-cream-dim">
                          {formatWhen(row.recorded_at || row.created_at)}
                        </td>
                        <td className="py-3 pr-4 capitalize text-cream">
                          {row.entry_type}
                        </td>
                        <td className="py-3 pr-4 text-cream">
                          {PAYMENT_METHOD_LABELS[row.payment_method] ||
                            row.payment_method}
                        </td>
                        <td className="py-3 pr-4 text-cream">
                          {formatMoneyAmount(row.amount, row.currency || currency)}
                        </td>
                        <td className="py-3 pr-4 text-cream-dim">
                          {row.reference_code || "—"}
                          {row.notes ? (
                            <div className="mt-1 text-xs text-cream-muted">
                              {row.notes}
                            </div>
                          ) : null}
                          {row.status === "void" && row.void_reason ? (
                            <div className="mt-1 text-xs text-gold">
                              Void: {row.void_reason}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="py-3">
                          {row.status === "active" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setVoidTarget(row);
                                setVoidReason("");
                              }}
                              className="border border-cream/30 px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream hover:border-gold hover:text-gold disabled:opacity-50"
                            >
                              Void
                            </button>
                          ) : (
                            <span className="text-xs text-cream-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(voidTarget)}
        title="Void ledger entry"
        message={
          voidTarget
            ? `Void this ${voidTarget.entry_type} of ${formatMoneyAmount(
                voidTarget.amount,
                voidTarget.currency || currency
              )}? The row stays in history and is excluded from net paid.`
            : ""
        }
        confirmLabel="Void entry"
        busy={busy}
        onCancel={() => {
          if (!busy) {
            setVoidTarget(null);
            setVoidReason("");
          }
        }}
        onConfirm={confirmVoid}
      >
        <div className="mt-4">
          <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
            Void reason *
          </label>
          <textarea
            rows={3}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            maxLength={2000}
            className={`${inputClass} resize-y`}
            placeholder="Why is this entry being voided?"
          />
        </div>
      </ConfirmDialog>
    </section>
  );
}
