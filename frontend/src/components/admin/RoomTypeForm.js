"use client";

import { Loader2 } from "lucide-react";
import { ROOM_TYPE_STATUSES, slugifyRoomTypeName } from "@/lib/adminRoomTypes";

const INPUT =
  "w-full bg-ink border px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:outline-none focus:border-gold transition-colors";
const LABEL =
  "block text-[11px] tracking-[0.25em] uppercase text-cream-muted mb-2";

function inputClass(hasError) {
  return `${INPUT} ${hasError ? "border-gold" : "border-ink-line"}`;
}

function Field({ id, label, error, children, className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-xs text-gold">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Room type create/edit form — fields match room_types columns.
 * Featured maps to metadata.is_featured (no schema change).
 */
export default function RoomTypeForm({
  form,
  hotels = [],
  onChange,
  onSubmit,
  submitLabel = "Save",
  isLoading = false,
  errorMessage = "",
  fieldErrors = {},
  autoSlugFromName = false,
}) {
  function update(field, value) {
    const next = { ...form, [field]: value };
    if (autoSlugFromName && field === "name" && !form.slugLocked) {
      next.slug = slugifyRoomTypeName(value);
    }
    onChange(next);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {errorMessage && (
        <div
          role="alert"
          className="border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
        >
          {errorMessage}
        </div>
      )}

      <section className="border border-ink-line bg-ink-soft p-6 sm:p-8">
        <h2 className="font-display text-2xl text-cream">Identity</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="rt-hotel"
            label="Hotel *"
            error={fieldErrors.hotel_id}
            className="sm:col-span-2"
          >
            <select
              id="rt-hotel"
              className={inputClass(fieldErrors.hotel_id)}
              value={form.hotel_id}
              onChange={(e) => update("hotel_id", e.target.value)}
              aria-invalid={Boolean(fieldErrors.hotel_id)}
              required
            >
              <option value="">Select hotel…</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="rt-name"
            label="Name *"
            error={fieldErrors.name}
            className="sm:col-span-2"
          >
            <input
              id="rt-name"
              className={inputClass(fieldErrors.name)}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              required
            />
          </Field>

          <Field
            id="rt-slug"
            label="Slug *"
            error={fieldErrors.slug}
            className="sm:col-span-2"
          >
            <input
              id="rt-slug"
              className={inputClass(fieldErrors.slug)}
              value={form.slug}
              onChange={(e) =>
                onChange({ ...form, slug: e.target.value, slugLocked: true })
              }
              aria-invalid={Boolean(fieldErrors.slug)}
              required
            />
          </Field>

          <Field
            id="rt-description"
            label="Description"
            error={fieldErrors.description}
            className="sm:col-span-2"
          >
            <textarea
              id="rt-description"
              rows={4}
              className={`${inputClass(fieldErrors.description)} resize-y`}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="border border-ink-line bg-ink-soft p-6 sm:p-8">
        <h2 className="font-display text-2xl text-cream">Details</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="rt-base-price" label="Base price" error={fieldErrors.base_price}>
            <input
              id="rt-base-price"
              type="number"
              min="0"
              step="0.01"
              className={inputClass(fieldErrors.base_price)}
              value={form.base_price}
              onChange={(e) => update("base_price", e.target.value)}
            />
          </Field>
          <Field
            id="rt-max-occ"
            label="Max occupancy"
            error={fieldErrors.max_occupancy}
          >
            <input
              id="rt-max-occ"
              type="number"
              min="1"
              step="1"
              className={inputClass(fieldErrors.max_occupancy)}
              value={form.max_occupancy}
              onChange={(e) => update("max_occupancy", e.target.value)}
            />
          </Field>
          <Field id="rt-bed" label="Bed type" error={fieldErrors.bed_type}>
            <input
              id="rt-bed"
              className={inputClass(fieldErrors.bed_type)}
              value={form.bed_type}
              onChange={(e) => update("bed_type", e.target.value)}
              placeholder="King, Twin…"
            />
          </Field>
          <Field
            id="rt-size"
            label="Room size (sqft)"
            error={fieldErrors.room_size_sqft}
          >
            <input
              id="rt-size"
              type="number"
              min="1"
              step="1"
              className={inputClass(fieldErrors.room_size_sqft)}
              value={form.room_size_sqft}
              onChange={(e) => update("room_size_sqft", e.target.value)}
            />
          </Field>
          <Field id="rt-sort" label="Sort order" error={fieldErrors.sort_order}>
            <input
              id="rt-sort"
              type="number"
              step="1"
              className={inputClass(fieldErrors.sort_order)}
              value={form.sort_order}
              onChange={(e) => update("sort_order", e.target.value)}
            />
          </Field>
          <Field id="rt-status" label="Status" error={fieldErrors.status}>
            <select
              id="rt-status"
              className={inputClass(fieldErrors.status)}
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              {ROOM_TYPE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2 flex items-center gap-3 pt-2">
            <input
              id="rt-featured"
              type="checkbox"
              checked={Boolean(form.is_featured)}
              onChange={(e) => update("is_featured", e.target.checked)}
              className="h-4 w-4 accent-[#c9a96e]"
            />
            <label
              htmlFor="rt-featured"
              className="text-sm text-cream-dim cursor-pointer"
            >
              Featured room type
            </label>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 bg-gold px-8 py-3.5 text-xs tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft disabled:opacity-50"
        >
          {isLoading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
