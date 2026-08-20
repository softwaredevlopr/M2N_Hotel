"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import {
  createBookingInvoiceDraft,
  formatApiError,
  formatMoneyAmount,
  issueBookingInvoice,
  listBookingInvoices,
  voidBookingInvoice,
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

export default function BookingInvoicesPanel({
  bookingId,
  hotelId,
  currency = "INR",
  onFinanceChange,
  onInvoicesChange,
}) {
  const toast = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);

  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");

  const issuedInvoice = useMemo(
    () => rows.find((row) => row.status === "issued") || null,
    [rows]
  );

  const load = useCallback(async () => {
    if (!bookingId || !hotelId) return;
    setLoading(true);
    const result = await listBookingInvoices(bookingId, hotelId);
    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      setError(formatApiError(result, "Unable to load invoices."));
      setRows([]);
      if (onInvoicesChange) onInvoicesChange(null);
      setLoading(false);
      return;
    }
    const data = result.data?.data || [];
    setRows(data);
    setError("");
    setLoading(false);
    if (onInvoicesChange) {
      const issued = data.find((row) => row.status === "issued") || null;
      onInvoicesChange(issued);
    }
    // onInvoicesChange is intentionally omitted from deps to avoid reload loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, hotelId, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function createDraft({ replacesInvoiceId = null } = {}) {
    setBusy(true);
    const body = {};
    if (replacesInvoiceId) body.replaces_invoice_id = replacesInvoiceId;
    const result = await createBookingInvoiceDraft(bookingId, hotelId, body);
    setBusy(false);
    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return null;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to create invoice draft."));
      return null;
    }
    toast.success(
      replacesInvoiceId ? "Reissue draft created." : "Invoice draft created."
    );
    await load();
    return result.data?.data || null;
  }

  async function issueInvoice(invoice) {
    setBusy(true);
    const result = await issueBookingInvoice(
      bookingId,
      hotelId,
      invoice.id,
      {}
    );
    setBusy(false);
    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to issue invoice."));
      return;
    }
    toast.success(
      `Invoice issued: ${result.data?.data?.invoice_number || "OK"}`
    );
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
    const result = await voidBookingInvoice(
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
      toast.error(formatApiError(result, "Unable to void invoice."));
      return;
    }
    toast.success("Invoice voided.");
    setVoidTarget(null);
    setVoidReason("");
    await load();
    if (onFinanceChange) {
      await onFinanceChange({
        payment_status: result.data?.payment_status,
      });
    }
  }

  async function reissueFromVoided(invoice) {
    const draft = await createDraft({ replacesInvoiceId: invoice.id });
    if (draft?.id) {
      await issueInvoice(draft);
    }
  }

  return (
    <section className="border border-ink-line bg-ink-soft p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[11px] tracking-[0.25em] uppercase text-gold">
            Invoices
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-cream-muted">
            Draft → issue → void. At most one issued invoice per booking.
            Corrections use void + reissue (new number).
          </p>
        </div>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => createDraft()}
          className="inline-flex items-center justify-center border border-cream/30 px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase text-cream hover:border-gold hover:text-gold disabled:opacity-50"
        >
          Create draft
        </button>
      </div>

      {issuedInvoice && (
        <p className="mt-4 text-xs text-cream-muted">
          Active issued invoice:{" "}
          <span className="text-cream">{issuedInvoice.invoice_number}</span>
          {" · "}
          {formatMoneyAmount(
            issuedInvoice.total_amount,
            issuedInvoice.currency || currency
          )}
          . Issue / reissue stay blocked until this invoice is voided.
        </p>
      )}

      {loading ? (
        <p className="mt-6 inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading invoices…
        </p>
      ) : error ? (
        <p role="alert" className="mt-6 text-sm text-gold">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-cream-muted">
          No invoices yet. Create a draft from the current booking snapshot.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-line text-[10px] tracking-[0.2em] uppercase text-cream-muted">
                <th className="py-2 pr-4 font-normal">Number</th>
                <th className="py-2 pr-4 font-normal">Status</th>
                <th className="py-2 pr-4 font-normal">Total</th>
                <th className="py-2 pr-4 font-normal">Issued</th>
                <th className="py-2 pr-4 font-normal">Notes</th>
                <th className="py-2 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-ink-line/70 align-top"
                >
                  <td className="py-3 pr-4 text-cream">
                    {row.invoice_number}
                    {row.replaces_invoice_id ? (
                      <div className="mt-1 text-xs text-cream-muted">
                        Replaces prior invoice
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="py-3 pr-4 text-cream">
                    {formatMoneyAmount(row.total_amount, row.currency || currency)}
                    <div className="mt-1 text-xs text-cream-muted">
                      Sub {formatMoneyAmount(row.subtotal, row.currency || currency)}
                      {" · Tax "}
                      {formatMoneyAmount(row.tax_amount, row.currency || currency)}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-cream-dim">
                    {formatWhen(row.issued_at)}
                    {row.voided_at ? (
                      <div className="mt-1 text-xs text-gold">
                        Voided {formatWhen(row.voided_at)}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-cream-dim">
                    {row.void_reason || row.notes || "—"}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {row.status === "draft" && (
                        <button
                          type="button"
                          disabled={busy || Boolean(issuedInvoice)}
                          onClick={() => issueInvoice(row)}
                          className="border border-gold/50 px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-gold hover:border-gold hover:bg-gold/10 disabled:opacity-50"
                        >
                          Issue
                        </button>
                      )}
                      {row.status === "issued" && (
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
                      )}
                      {row.status === "void" && (
                        <button
                          type="button"
                          disabled={busy || Boolean(issuedInvoice)}
                          onClick={() => reissueFromVoided(row)}
                          className="border border-cream/30 px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream hover:border-gold hover:text-gold disabled:opacity-50"
                        >
                          Reissue
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(voidTarget)}
        title="Void invoice"
        message={
          voidTarget
            ? `Void issued invoice ${voidTarget.invoice_number}? The number is kept for audit; reissue creates a new draft.`
            : ""
        }
        confirmLabel="Void invoice"
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
            placeholder="Why is this invoice being voided?"
          />
        </div>
      </ConfirmDialog>
    </section>
  );
}
