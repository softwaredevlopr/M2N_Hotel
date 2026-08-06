"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  INQUIRY_STATUSES,
  formatApiError,
  listAdminInquiries,
  deleteAdminInquiry,
} from "@/lib/adminInquiries";
import { listAdminHotels } from "@/lib/adminHotels";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

const PAGE_SIZE = 20;

function formatDate(iso) {
  if (!iso) return "—";
  return String(iso).slice(0, 10);
}

function formatDateTime(value) {
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

export default function AdminInquiriesPage() {
  return (
    <Suspense
      fallback={
        <p className="inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading…
        </p>
      }
    >
      <AdminInquiriesPageInner />
    </Suspense>
  );
}

function AdminInquiriesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialStatus = searchParams.get("status") || "";
  const initialHotel = searchParams.get("hotel_id") || "";

  const [inquiries, setInquiries] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [hotelId, setHotelId] = useState(initialHotel);
  const [status, setStatus] = useState(
    INQUIRY_STATUSES.includes(initialStatus) ? initialStatus : ""
  );
  const [offset, setOffset] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadHotels() {
      const result = await listAdminHotels();
      if (cancelled) return;
      if (result.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (result.ok) setHotels(result.data?.data || []);
    }
    loadHotels();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await listAdminInquiries({
      q: appliedQ.trim() || undefined,
      hotel_id: hotelId || undefined,
      status: status || undefined,
      limit: PAGE_SIZE,
      offset,
    });

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      const message = formatApiError(result, "Unable to load inquiries.");
      setError(message);
      toast.error(message);
      setInquiries([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setInquiries(result.data?.data || []);
    setTotal(Number(result.data?.total) || 0);
    setLoading(false);
  }, [appliedQ, hotelId, status, offset, router, toast]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(event) {
    event.preventDefault();
    setOffset(0);
    setAppliedQ(q);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const result = await deleteAdminInquiry(deleteTarget.id);
    setDeleting(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Delete failed."));
      return;
    }

    toast.success("Inquiry deleted.");
    setDeleteTarget(null);
    load();
  }

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <div>
      <div>
        <span className="text-xs tracking-[0.45em] uppercase text-gold">
          Inquiries
        </span>
        <div className="gold-divider mt-5" />
        <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
          Guest Inquiries
        </h1>
        <p className="mt-3 text-sm text-cream-dim">
          Search, review, and update booking inquiries from the website form.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-10 grid grid-cols-1 gap-3 border border-ink-line bg-ink-soft p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone…"
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:border-gold focus:outline-none sm:col-span-2"
        />
        <select
          value={hotelId}
          onChange={(e) => {
            setOffset(0);
            setHotelId(e.target.value);
          }}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All hotels</option>
          {hotels.map((hotel) => (
            <option key={hotel.id} value={hotel.id}>
              {hotel.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setOffset(0);
            setStatus(e.target.value);
          }}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All statuses</option>
          {INQUIRY_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-gold px-5 py-3 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:bg-gold-soft sm:col-span-2 lg:col-span-1"
        >
          Search
        </button>
      </form>

      {error && !loading && (
        <div
          role="alert"
          className="mt-6 border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
        >
          {error}
        </div>
      )}

      <div className="mt-6 overflow-x-auto border border-ink-line">
        <table className="min-w-full text-left">
          <thead className="bg-ink-soft">
            <tr>
              {["Guest", "Hotel", "Stay", "Status", "Received", ""].map(
                (label) => (
                  <th
                    key={label || "actions"}
                    className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold"
                  >
                    {label}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-cream-muted"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2
                      className="h-4 w-4 animate-spin text-gold"
                      strokeWidth={2}
                    />
                    Loading inquiries…
                  </span>
                </td>
              </tr>
            ) : inquiries.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-cream-muted"
                >
                  No inquiries found.
                </td>
              </tr>
            ) : (
              inquiries.map((inquiry) => (
                <tr
                  key={inquiry.id}
                  className="border-t border-ink-line transition-colors hover:bg-ink-soft/60"
                >
                  <td className="px-4 py-4">
                    <div className="text-sm text-cream">{inquiry.guest_name}</div>
                    <div className="mt-1 text-xs text-cream-muted">
                      {inquiry.guest_email}
                    </div>
                    {inquiry.guest_phone ? (
                      <div className="mt-0.5 text-xs text-cream-muted">
                        {inquiry.guest_phone}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {inquiry.hotel_name}
                    {inquiry.room_type_name ? (
                      <div className="mt-1 text-xs text-cream-muted">
                        {inquiry.room_type_name}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {inquiry.check_in_date || inquiry.check_out_date
                      ? `${formatDate(inquiry.check_in_date)} → ${formatDate(inquiry.check_out_date)}`
                      : "—"}
                    <div className="mt-1 text-xs text-cream-muted">
                      {inquiry.adults_count} adult(s)
                      {Number(inquiry.children_count) > 0
                        ? `, ${inquiry.children_count} child(ren)`
                        : ""}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={inquiry.status} />
                  </td>
                  <td className="px-4 py-4 text-xs text-cream-muted">
                    {formatDateTime(inquiry.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                      <Link
                        href={`/admin/inquiries/${inquiry.id}`}
                        className="text-[11px] tracking-[0.2em] uppercase text-gold hover:text-cream"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(inquiry)}
                        className="text-[11px] tracking-[0.2em] uppercase text-cream-muted hover:text-gold"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs tracking-[0.15em] uppercase text-cream-muted">
          {total === 0
            ? "0 inquiries"
            : `Showing ${pageStart}–${pageEnd} of ${total}`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canPrev || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="border border-ink-line px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-cream-muted transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!canNext || loading}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="border border-ink-line px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-cream-muted transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete inquiry?"
        message={
          deleteTarget
            ? `Delete inquiry from “${deleteTarget.guest_name}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete Inquiry"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => (!deleting ? setDeleteTarget(null) : null)}
      />
    </div>
  );
}
