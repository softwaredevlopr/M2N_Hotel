"use client";

import { Loader2 } from "lucide-react";
import { HOTEL_STATUSES, slugifyHotelName } from "@/lib/adminHotels";

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
 * Hotel create/edit form — fields match hotels table columns only.
 */
export default function HotelForm({
  form,
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
      next.slug = slugifyHotelName(value);
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
            id="hotel-name"
            label="Name *"
            error={fieldErrors.name}
            className="sm:col-span-2"
          >
            <input
              id="hotel-name"
              className={inputClass(fieldErrors.name)}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              required
            />
          </Field>
          <Field
            id="hotel-slug"
            label="Slug *"
            error={fieldErrors.slug}
            className="sm:col-span-2"
          >
            <input
              id="hotel-slug"
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
            id="hotel-tagline"
            label="Tagline"
            error={fieldErrors.tagline}
            className="sm:col-span-2"
          >
            <input
              id="hotel-tagline"
              className={inputClass(fieldErrors.tagline)}
              value={form.tagline}
              onChange={(e) => update("tagline", e.target.value)}
            />
          </Field>
          <Field
            id="hotel-description"
            label="Description"
            error={fieldErrors.description}
            className="sm:col-span-2"
          >
            <textarea
              id="hotel-description"
              rows={4}
              className={`${inputClass(fieldErrors.description)} resize-y`}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="border border-ink-line bg-ink-soft p-6 sm:p-8">
        <h2 className="font-display text-2xl text-cream">Contact</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="hotel-email" label="Email" error={fieldErrors.email}>
            <input
              id="hotel-email"
              type="email"
              className={inputClass(fieldErrors.email)}
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>
          <Field id="hotel-phone" label="Phone" error={fieldErrors.phone}>
            <input
              id="hotel-phone"
              className={inputClass(fieldErrors.phone)}
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>
          <Field
            id="hotel-website"
            label="Website URL"
            error={fieldErrors.website_url}
            className="sm:col-span-2"
          >
            <input
              id="hotel-website"
              className={inputClass(fieldErrors.website_url)}
              value={form.website_url}
              onChange={(e) => update("website_url", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="border border-ink-line bg-ink-soft p-6 sm:p-8">
        <h2 className="font-display text-2xl text-cream">Address</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="hotel-address1"
            label="Address line 1"
            error={fieldErrors.address_line1}
            className="sm:col-span-2"
          >
            <input
              id="hotel-address1"
              className={inputClass(fieldErrors.address_line1)}
              value={form.address_line1}
              onChange={(e) => update("address_line1", e.target.value)}
            />
          </Field>
          <Field
            id="hotel-address2"
            label="Address line 2"
            error={fieldErrors.address_line2}
            className="sm:col-span-2"
          >
            <input
              id="hotel-address2"
              className={inputClass(fieldErrors.address_line2)}
              value={form.address_line2}
              onChange={(e) => update("address_line2", e.target.value)}
            />
          </Field>
          <Field id="hotel-city" label="City" error={fieldErrors.city}>
            <input
              id="hotel-city"
              className={inputClass(fieldErrors.city)}
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </Field>
          <Field id="hotel-state" label="State" error={fieldErrors.state}>
            <input
              id="hotel-state"
              className={inputClass(fieldErrors.state)}
              value={form.state}
              onChange={(e) => update("state", e.target.value)}
            />
          </Field>
          <Field id="hotel-country" label="Country" error={fieldErrors.country}>
            <input
              id="hotel-country"
              className={inputClass(fieldErrors.country)}
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
            />
          </Field>
          <Field
            id="hotel-postal"
            label="Postal code"
            error={fieldErrors.postal_code}
          >
            <input
              id="hotel-postal"
              className={inputClass(fieldErrors.postal_code)}
              value={form.postal_code}
              onChange={(e) => update("postal_code", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="border border-ink-line bg-ink-soft p-6 sm:p-8">
        <h2 className="font-display text-2xl text-cream">Stay settings</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            id="hotel-timezone"
            label="Timezone"
            error={fieldErrors.timezone}
          >
            <input
              id="hotel-timezone"
              className={inputClass(fieldErrors.timezone)}
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
            />
          </Field>
          <Field
            id="hotel-checkin"
            label="Check-in time"
            error={fieldErrors.check_in_time}
          >
            <input
              id="hotel-checkin"
              type="time"
              className={inputClass(fieldErrors.check_in_time)}
              value={form.check_in_time}
              onChange={(e) => update("check_in_time", e.target.value)}
            />
          </Field>
          <Field
            id="hotel-checkout"
            label="Check-out time"
            error={fieldErrors.check_out_time}
          >
            <input
              id="hotel-checkout"
              type="time"
              className={inputClass(fieldErrors.check_out_time)}
              value={form.check_out_time}
              onChange={(e) => update("check_out_time", e.target.value)}
            />
          </Field>
          <Field
            id="hotel-currency"
            label="Currency code"
            error={fieldErrors.currency_code}
          >
            <input
              id="hotel-currency"
              className={inputClass(fieldErrors.currency_code)}
              maxLength={3}
              value={form.currency_code}
              onChange={(e) => update("currency_code", e.target.value)}
            />
          </Field>
          <Field
            id="hotel-stars"
            label="Star rating"
            error={fieldErrors.star_rating}
          >
            <select
              id="hotel-stars"
              className={inputClass(fieldErrors.star_rating)}
              value={form.star_rating}
              onChange={(e) => update("star_rating", e.target.value)}
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field id="hotel-status" label="Status" error={fieldErrors.status}>
            <select
              id="hotel-status"
              className={inputClass(fieldErrors.status)}
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              {HOTEL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end pb-3 lg:col-span-3">
            <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-cream-dim">
              <input
                type="checkbox"
                checked={Boolean(form.is_featured)}
                onChange={(e) => update("is_featured", e.target.checked)}
                className="h-4 w-4 accent-[var(--color-gold)]"
              />
              Featured hotel
            </label>
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center justify-center gap-2 bg-gold px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        )}
        {isLoading ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
