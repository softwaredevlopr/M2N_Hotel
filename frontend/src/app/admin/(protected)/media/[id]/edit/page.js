"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/admin/Toast";
import {
  getAdminMedia,
  updateAdminMedia,
  mediaToForm,
  formToMediaUpdatePayload,
  validateMediaEditForm,
  MEDIA_CATEGORIES,
  MEDIA_STATUSES,
  resolveAdminMediaUrl,
  formatApiError,
} from "@/lib/adminMedia";
import { listAdminHotels } from "@/lib/adminHotels";
import { clearAdminSession } from "@/lib/adminAuth";

const INPUT =
  "w-full bg-ink border px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:outline-none focus:border-gold transition-colors";
const LABEL =
  "block text-[11px] tracking-[0.25em] uppercase text-cream-muted mb-2";

function inputClass(hasError) {
  return `${INPUT} ${hasError ? "border-gold" : "border-ink-line"}`;
}

export default function EditMediaPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [mediaResult, hotelsResult] = await Promise.all([
        getAdminMedia(id),
        listAdminHotels(),
      ]);
      if (cancelled) return;

      if (mediaResult.unauthorized || hotelsResult.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (hotelsResult.ok) setHotels(hotelsResult.data?.data || []);

      if (!mediaResult.ok) {
        const message = formatApiError(mediaResult, "Media not found.");
        setError(message);
        toast.error(message);
        setLoading(false);
        return;
      }

      setForm(mediaToForm(mediaResult.data?.data));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, router, toast]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors({});
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving || !form) return;

    const validation = validateMediaEditForm(form);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setError("Please fix the highlighted fields.");
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors({});

    const result = await updateAdminMedia(id, formToMediaUpdatePayload(form));

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      const message = formatApiError(result, "Unable to update media.");
      setError(message);
      toast.error(message);
      setSaving(false);
      return;
    }

    toast.success("Media updated successfully.");
    router.replace("/admin/media");
  }

  if (loading) {
    return (
      <p className="inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
        <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
        Loading…
      </p>
    );
  }

  if (!form) {
    return (
      <div>
        <Link
          href="/admin/media"
          className="text-[11px] tracking-[0.22em] uppercase text-cream-muted hover:text-gold"
        >
          ← Media
        </Link>
        <p role="alert" className="mt-6 text-sm text-gold">
          {error || "Media not found."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/media"
        className="text-[11px] tracking-[0.22em] uppercase text-cream-muted hover:text-gold"
      >
        ← Media
      </Link>
      <h1 className="mt-6 font-display text-4xl text-cream">Edit Media</h1>
      <p className="mt-3 text-sm text-cream-dim">
        Update metadata for this hotel_media row.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-8" noValidate>
        {error && (
          <div
            role="alert"
            className="border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
          >
            {error}
          </div>
        )}

        <section className="border border-ink-line bg-ink-soft p-6 sm:p-8">
          <h2 className="font-display text-2xl text-cream">Preview</h2>
          <div className="mt-6 border border-ink-line bg-ink min-h-[180px] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveAdminMediaUrl(form.url)}
              alt={form.alt_text || "Media preview"}
              className="max-h-72 w-full object-contain"
            />
          </div>
        </section>

        <section className="border border-ink-line bg-ink-soft p-6 sm:p-8">
          <h2 className="font-display text-2xl text-cream">Metadata</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="edit-hotel" className={LABEL}>
                Hotel *
              </label>
              <select
                id="edit-hotel"
                className={inputClass(fieldErrors.hotel_id)}
                value={form.hotel_id}
                onChange={(e) => update("hotel_id", e.target.value)}
              >
                <option value="">Select hotel…</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              {fieldErrors.hotel_id && (
                <p className="mt-1.5 text-xs text-gold">{fieldErrors.hotel_id}</p>
              )}
            </div>

            <div>
              <label htmlFor="edit-category" className={LABEL}>
                Category *
              </label>
              <select
                id="edit-category"
                className={inputClass(fieldErrors.category)}
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              >
                {MEDIA_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="edit-status" className={LABEL}>
                Status
              </label>
              <select
                id="edit-status"
                className={inputClass(fieldErrors.status)}
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
              >
                {MEDIA_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="edit-alt" className={LABEL}>
                Alt text
              </label>
              <input
                id="edit-alt"
                className={inputClass(fieldErrors.alt_text)}
                value={form.alt_text}
                onChange={(e) => update("alt_text", e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="edit-sort" className={LABEL}>
                Sort order
              </label>
              <input
                id="edit-sort"
                type="number"
                step="1"
                className={inputClass(fieldErrors.sort_order)}
                value={form.sort_order}
                onChange={(e) => update("sort_order", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="edit-caption" className={LABEL}>
                Caption
              </label>
              <textarea
                id="edit-caption"
                rows={3}
                className={`${inputClass(false)} resize-y`}
                value={form.caption}
                onChange={(e) => update("caption", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3">
              <input
                id="edit-cover"
                type="checkbox"
                checked={Boolean(form.is_cover)}
                onChange={(e) => update("is_cover", e.target.checked)}
                className="h-4 w-4 accent-[#c9a96e]"
              />
              <label htmlFor="edit-cover" className="text-sm text-cream-dim cursor-pointer">
                Featured / cover image for this hotel
              </label>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 bg-gold px-8 py-3.5 text-xs tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft disabled:opacity-50"
        >
          {saving && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          )}
          Save Changes
        </button>
      </form>
    </div>
  );
}
