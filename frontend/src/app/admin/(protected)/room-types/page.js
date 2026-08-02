"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  listAdminRoomTypes,
  deleteAdminRoomType,
  updateAdminRoomType,
  ROOM_TYPE_STATUSES,
  formatApiError,
} from "@/lib/adminRoomTypes";
import { listAdminHotels } from "@/lib/adminHotels";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

export default function AdminRoomTypesPage() {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [hotelId, setHotelId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
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
      if (result.ok) {
        setHotels(result.data?.data || []);
      }
    }
    loadHotels();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAdminRoomTypes({
      q: appliedQ.trim() || undefined,
      hotel_id: hotelId || undefined,
      status: status || undefined,
    });

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to load room types."));
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(result.data?.data || []);
    setLoading(false);
  }, [appliedQ, hotelId, status, router, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const result = await deleteAdminRoomType(deleteTarget.id);
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

    setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    toast.success(`“${deleteTarget.name}” was deleted.`);
    setDeleteTarget(null);
  }

  async function toggleFeatured(row) {
    if (togglingId) return;
    setTogglingId(row.id);
    const next = !row.is_featured;
    const result = await updateAdminRoomType(row.id, { is_featured: next });
    setTogglingId(null);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to update featured."));
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, is_featured: next } : r
      )
    );
    toast.success(next ? "Marked featured." : "Unmarked featured.");
  }

  async function toggleActive(row) {
    if (togglingId) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(row.id);
    const result = await updateAdminRoomType(row.id, { status: nextStatus });
    setTogglingId(null);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to update status."));
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r))
    );
    toast.success(
      nextStatus === "active" ? "Set to active." : "Set to inactive."
    );
  }

  function handleSearch(event) {
    event.preventDefault();
    setAppliedQ(q);
  }

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Room Types
          </span>
          <div className="gold-divider mt-5" />
          <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
            Room Type Management
          </h1>
          <p className="mt-3 text-sm text-cream-dim">
            List, search, and manage room types per hotel.
          </p>
        </div>
        <Link
          href="/admin/room-types/new"
          className="inline-flex items-center justify-center bg-gold px-7 py-3.5 text-xs tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft"
        >
          Add Room Type
        </Link>
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-10 flex flex-col gap-3 border border-ink-line bg-ink-soft p-4 lg:flex-row lg:items-center"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, slug, or bed type…"
          className="w-full flex-1 bg-ink border border-ink-line px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:border-gold focus:outline-none"
        />
        <select
          value={hotelId}
          onChange={(e) => setHotelId(e.target.value)}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All hotels</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All statuses</option>
          {ROOM_TYPE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 border border-cream/30 px-6 py-3 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
        >
          {loading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          )}
          Search
        </button>
      </form>

      <div className="mt-8 overflow-x-auto border border-ink-line">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="bg-ink-soft">
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Name
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Hotel
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Price
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Status
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-cream-muted"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2
                      className="h-4 w-4 animate-spin text-gold"
                      strokeWidth={2}
                    />
                    Loading room types…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-cream-muted"
                >
                  No room types found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-ink-line transition-colors hover:bg-ink-soft/60"
                >
                  <td className="px-4 py-4">
                    <div className="font-display text-lg text-cream">
                      {row.name}
                    </div>
                    <div className="mt-1 text-xs text-cream-muted">
                      {row.slug}
                    </div>
                    {row.is_featured && (
                      <span className="mt-1 inline-block text-[10px] tracking-[0.2em] uppercase text-gold">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {row.hotel_name || "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {row.base_price != null
                      ? Number(row.base_price).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/room-types/${row.id}/edit`}
                        className="border border-ink-line px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream-dim transition-colors hover:border-gold hover:text-gold"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={togglingId === row.id}
                        onClick={() => toggleActive(row)}
                        className="border border-ink-line px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream-dim transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
                      >
                        {row.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        disabled={togglingId === row.id}
                        onClick={() => toggleFeatured(row)}
                        className="border border-ink-line px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream-dim transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
                      >
                        {row.is_featured ? "Unfeature" : "Feature"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        className="border border-gold/40 px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-gold transition-colors hover:bg-gold/10"
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete room type?"
        message={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete Room Type"
        cancelLabel="Cancel"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => (!deleting ? setDeleteTarget(null) : null)}
      />
    </div>
  );
}
