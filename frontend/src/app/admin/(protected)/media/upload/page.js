"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/admin/Toast";
import {
  emptyMediaUploadForm,
  uploadAdminMedia,
  validateMediaUploadForm,
  MEDIA_CATEGORIES,
  MEDIA_STATUSES,
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

export default function UploadMediaPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(() => emptyMediaUploadForm());
  const [hotels, setHotels] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

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

  useEffect(() => {
    if (!form.file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(form.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.file]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors({});
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    const validation = validateMediaUploadForm(form);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setError("Please fix the highlighted fields.");
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    const result = await uploadAdminMedia(form);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      const message = formatApiError(result, "Unable to upload media.");
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    toast.success("Media uploaded successfully.");
    router.replace("/admin/media");
  }

  return (
    <div>
      <Link
        href="/admin/media"
        className="text-[11px] tracking-[0.22em] uppercase text-cream-muted transition-colors hover:text-gold"
      >
        ← Media
      </Link>
      <h1 className="mt-6 font-display text-4xl text-cream">Upload Media</h1>
      <p className="mt-3 text-sm text-cream-dim">
        Upload an image into hotel_media. Category is stored in the file path
        (no schema change).
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
          <h2 className="font-display text-2xl text-cream">Image</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div>
              <label htmlFor="media-file" className={LABEL}>
                File *
              </label>
              <input
                id="media-file"
                type="file"
                accept="image/*"
                className={`${inputClass(fieldErrors.file)} file:mr-4 file:border-0 file:bg-gold/20 file:px-3 file:py-1 file:text-xs file:text-gold`}
                onChange={(e) => update("file", e.target.files?.[0] || null)}
              />
              {fieldErrors.file && (
                <p className="mt-1.5 text-xs text-gold">{fieldErrors.file}</p>
              )}
              <p className="mt-2 text-xs text-cream-muted">
                JPG, PNG, WebP, or GIF · max 5MB
              </p>
            </div>
            <div className="border border-ink-line bg-ink min-h-[160px] flex items-center justify-center">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="max-h-56 w-full object-contain"
                />
              ) : (
                <span className="text-xs tracking-[0.2em] uppercase text-cream-muted">
                  Preview
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="border border-ink-line bg-ink-soft p-6 sm:p-8">
          <h2 className="font-display text-2xl text-cream">Details</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="media-hotel" className={LABEL}>
                Hotel *
              </label>
              <select
                id="media-hotel"
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
              <label htmlFor="media-category" className={LABEL}>
                Category *
              </label>
              <select
                id="media-category"
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
              <label htmlFor="media-status" className={LABEL}>
                Status
              </label>
              <select
                id="media-status"
                className={inputClass(false)}
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
              <label htmlFor="media-alt" className={LABEL}>
                Alt text
              </label>
              <input
                id="media-alt"
                className={inputClass(fieldErrors.alt_text)}
                value={form.alt_text}
                onChange={(e) => update("alt_text", e.target.value)}
              />
              {fieldErrors.alt_text && (
                <p className="mt-1.5 text-xs text-gold">{fieldErrors.alt_text}</p>
              )}
            </div>

            <div>
              <label htmlFor="media-sort" className={LABEL}>
                Sort order
              </label>
              <input
                id="media-sort"
                type="number"
                step="1"
                className={inputClass(fieldErrors.sort_order)}
                value={form.sort_order}
                onChange={(e) => update("sort_order", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="media-caption" className={LABEL}>
                Caption
              </label>
              <textarea
                id="media-caption"
                rows={3}
                className={`${inputClass(false)} resize-y`}
                value={form.caption}
                onChange={(e) => update("caption", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3">
              <input
                id="media-cover"
                type="checkbox"
                checked={Boolean(form.is_cover)}
                onChange={(e) => update("is_cover", e.target.checked)}
                className="h-4 w-4 accent-[#c9a96e]"
              />
              <label htmlFor="media-cover" className="text-sm text-cream-dim cursor-pointer">
                Featured / cover image for this hotel
              </label>
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 bg-gold px-8 py-3.5 text-xs tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft disabled:opacity-50"
        >
          {loading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          )}
          Upload
        </button>
      </form>
    </div>
  );
}
