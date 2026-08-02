"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  listAdminMedia,
  deleteAdminMedia,
  updateAdminMedia,
  MEDIA_CATEGORIES,
  MEDIA_STATUSES,
  resolveAdminMediaUrl,
  formatApiError,
} from "@/lib/adminMedia";
import { listAdminHotels } from "@/lib/adminHotels";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

export default function AdminMediaPage() {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [hotelId, setHotelId] = useState("");
  const [category, setCategory] = useState("");
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
      if (result.ok) setHotels(result.data?.data || []);
    }
    loadHotels();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAdminMedia({
      q: appliedQ.trim() || undefined,
      hotel_id: hotelId || undefined,
      category: category || undefined,
      status: status || undefined,
    });

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to load media."));
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(result.data?.data || []);
    setLoading(false);
  }, [appliedQ, hotelId, category, status, router, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const result = await deleteAdminMedia(deleteTarget.id);
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
    toast.success("Media deleted.");
    setDeleteTarget(null);
  }

  async function toggleCover(row) {
    if (togglingId) return;
    setTogglingId(row.id);
    const next = !row.is_cover;
    const result = await updateAdminMedia(row.id, { is_cover: next });
    setTogglingId(null);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to update featured flag."));
      return;
    }

    setRows((prev) =>
      prev.map((r) => {
        if (r.id === row.id) return { ...r, is_cover: next };
        if (next && r.hotel_id === row.hotel_id) return { ...r, is_cover: false };
        return r;
      })
    );
    toast.success(next ? "Set as featured image." : "Removed featured flag.");
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
            Media
          </span>
          <div className="gold-divider mt-5" />
          <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
            Hotel Media
          </h1>
          <p className="mt-3 text-sm text-cream-dim">
            Upload, organize, and feature property images.
          </p>
        </div>
        <Link
          href="/admin/media/upload"
          className="inline-flex items-center justify-center bg-gold px-7 py-3.5 text-xs tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft"
        >
          Upload Media
        </Link>
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-10 flex flex-col gap-3 border border-ink-line bg-ink-soft p-4 xl:flex-row xl:items-center"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search alt, caption, or URL…"
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
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All categories</option>
          {MEDIA_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All statuses</option>
          {MEDIA_STATUSES.map((s) => (
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
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="bg-ink-soft">
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Preview
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Hotel
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Category
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Sort
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
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-cream-muted"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2
                      className="h-4 w-4 animate-spin text-gold"
                      strokeWidth={2}
                    />
                    Loading media…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-cream-muted"
                >
                  No media found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-ink-line transition-colors hover:bg-ink-soft/60"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveAdminMediaUrl(row.url)}
                        alt={row.alt_text || "Media preview"}
                        className="h-14 w-20 object-cover border border-ink-line bg-ink"
                      />
                      <div>
                        <div className="text-sm text-cream-dim line-clamp-1 max-w-[180px]">
                          {row.alt_text || row.caption || "—"}
                        </div>
                        {row.is_cover && (
                          <span className="mt-1 inline-block text-[10px] tracking-[0.2em] uppercase text-gold">
                            Featured
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {row.hotel_name || "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {row.category || "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {row.sort_order}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/media/${row.id}/edit`}
                        className="border border-ink-line px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream-dim transition-colors hover:border-gold hover:text-gold"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={togglingId === row.id}
                        onClick={() => toggleCover(row)}
                        className="border border-ink-line px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream-dim transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
                      >
                        {row.is_cover ? "Unfeature" : "Feature"}
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
        title="Delete media?"
        message="Delete this media item? Uploaded files will be removed. This cannot be undone."
        confirmLabel="Delete Media"
        cancelLabel="Cancel"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => (!deleting ? setDeleteTarget(null) : null)}
      />
    </div>
  );
}
