"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  listAdminHotels,
  deleteAdminHotel,
  HOTEL_STATUSES,
  formatApiError,
} from "@/lib/adminHotels";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

export default function AdminHotelsPage() {
  const router = useRouter();
  const toast = useToast();
  const [hotels, setHotels] = useState([]);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAdminHotels({
      q: appliedQ.trim() || undefined,
      status: status || undefined,
    });

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to load hotels."));
      setHotels([]);
      setLoading(false);
      return;
    }

    setHotels(result.data?.data || []);
    setLoading(false);
  }, [appliedQ, status, router, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const result = await deleteAdminHotel(deleteTarget.id);
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

    setHotels((prev) => prev.filter((h) => h.id !== deleteTarget.id));
    toast.success(`“${deleteTarget.name}” was deleted.`);
    setDeleteTarget(null);
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
            Hotels
          </span>
          <div className="gold-divider mt-5" />
          <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
            Hotel Management
          </h1>
          <p className="mt-3 text-sm text-cream-dim">
            List, search, and manage properties.
          </p>
        </div>
        <Link
          href="/admin/hotels/new"
          className="inline-flex items-center justify-center bg-gold px-7 py-3.5 text-xs tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft"
        >
          Add Hotel
        </Link>
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-10 flex flex-col gap-3 border border-ink-line bg-ink-soft p-4 sm:flex-row sm:items-center"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, slug, or city…"
          className="w-full flex-1 bg-ink border border-ink-line px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:border-gold focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All statuses</option>
          {HOTEL_STATUSES.map((s) => (
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
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="bg-ink-soft">
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Name
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Slug
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                City
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
                    Loading hotels…
                  </span>
                </td>
              </tr>
            ) : hotels.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-cream-muted"
                >
                  No hotels found.
                </td>
              </tr>
            ) : (
              hotels.map((hotel) => (
                <tr
                  key={hotel.id}
                  className="border-t border-ink-line transition-colors hover:bg-ink-soft/60"
                >
                  <td className="px-4 py-4">
                    <div className="font-display text-lg text-cream">
                      {hotel.name}
                    </div>
                    {hotel.is_featured && (
                      <span className="mt-1 inline-block text-[10px] tracking-[0.2em] uppercase text-gold">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {hotel.slug}
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {hotel.city || "—"}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={hotel.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/hotels/${hotel.id}`}
                        className="border border-ink-line px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream-dim transition-colors hover:border-gold hover:text-gold"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/hotels/${hotel.id}/edit`}
                        className="border border-ink-line px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream-dim transition-colors hover:border-gold hover:text-gold"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(hotel)}
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
        title="Delete hotel?"
        message={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? This cannot be undone and may remove related media and amenity links.`
            : ""
        }
        confirmLabel="Delete Hotel"
        cancelLabel="Cancel"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => (!deleting ? setDeleteTarget(null) : null)}
      />
    </div>
  );
}
