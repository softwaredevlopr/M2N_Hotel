"use client";

import { Loader2 } from "lucide-react";
import {
  ADMIN_CREATE_BOOKING_STATUSES,
  ADMIN_CREATE_SOURCES,
  PAYMENT_STATUSES,
} from "@/lib/adminBookings";
import { formatPrice } from "@/lib/format";
import { formatStayDate } from "@/lib/bookingPricing";

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

function sourceLabel(value) {
  return String(value || "").replace(/_/g, " ");
}

/**
 * Admin create-booking form. Notes map to existing `special_requests` only.
 */
export default function BookingCreateForm({
  form,
  hotels = [],
  roomTypes = [],
  priceSummary = null,
  availability = null,
  availabilityLoading = false,
  onChange,
  onSubmit,
  onCheckAvailability,
  isLoading = false,
  errorMessage = "",
  fieldErrors = {},
}) {
  function update(field, value) {
    const next = { ...form, [field]: value };
    if (field === "hotel_id") {
      next.room_type_id = "";
    }
    onChange(next);
  }

  const currency = priceSummary?.currency || "INR";

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
        <h2 className="font-display text-2xl text-cream">Guest details</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="bk-guest-name"
            label="Guest name *"
            error={fieldErrors.guest_name}
            className="sm:col-span-2"
          >
            <input
              id="bk-guest-name"
              className={inputClass(fieldErrors.guest_name)}
              value={form.guest_name}
              onChange={(e) => update("guest_name", e.target.value)}
              autoComplete="name"
              required
            />
          </Field>
          <Field id="bk-guest-email" label="Email *" error={fieldErrors.guest_email}>
            <input
              id="bk-guest-email"
              type="email"
              className={inputClass(fieldErrors.guest_email)}
              value={form.guest_email}
              onChange={(e) => update("guest_email", e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Field id="bk-guest-phone" label="Phone *" error={fieldErrors.guest_phone}>
            <input
              id="bk-guest-phone"
              type="tel"
              className={inputClass(fieldErrors.guest_phone)}
              value={form.guest_phone}
              onChange={(e) => update("guest_phone", e.target.value)}
              autoComplete="tel"
              required
            />
          </Field>
        </div>
      </section>

      <section className="border border-ink-line bg-ink-soft p-6 sm:p-8">
        <h2 className="font-display text-2xl text-cream">Stay</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="bk-hotel" label="Hotel *" error={fieldErrors.hotel_id} className="sm:col-span-2">
            <select
              id="bk-hotel"
              className={inputClass(fieldErrors.hotel_id)}
              value={form.hotel_id}
              onChange={(e) => update("hotel_id", e.target.value)}
              required
            >
              <option value="">Select hotel…</option>
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                  {hotel.status && hotel.status !== "active" ? ` (${hotel.status})` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="bk-room-type"
            label="Room type *"
            error={fieldErrors.room_type_id}
            className="sm:col-span-2"
          >
            <select
              id="bk-room-type"
              className={inputClass(fieldErrors.room_type_id)}
              value={form.room_type_id}
              onChange={(e) => update("room_type_id", e.target.value)}
              disabled={!form.hotel_id}
              required
            >
              <option value="">
                {form.hotel_id ? "Select room type…" : "Select a hotel first…"}
              </option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                  {rt.status && rt.status !== "active" ? ` (${rt.status})` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field id="bk-check-in" label="Check-in *" error={fieldErrors.check_in_date}>
            <input
              id="bk-check-in"
              type="date"
              className={inputClass(fieldErrors.check_in_date)}
              value={form.check_in_date}
              onChange={(e) => update("check_in_date", e.target.value)}
              required
            />
          </Field>
          <Field id="bk-check-out" label="Check-out *" error={fieldErrors.check_out_date}>
            <input
              id="bk-check-out"
              type="date"
              className={inputClass(fieldErrors.check_out_date)}
              value={form.check_out_date}
              onChange={(e) => update("check_out_date", e.target.value)}
              required
            />
          </Field>

          <Field id="bk-adults" label="Adults *" error={fieldErrors.adults}>
            <input
              id="bk-adults"
              type="number"
              min={1}
              max={30}
              className={inputClass(fieldErrors.adults)}
              value={form.adults}
              onChange={(e) => update("adults", e.target.value)}
              required
            />
          </Field>
          <Field id="bk-children" label="Children" error={fieldErrors.children}>
            <input
              id="bk-children"
              type="number"
              min={0}
              max={30}
              className={inputClass(fieldErrors.children)}
              value={form.children}
              onChange={(e) => update("children", e.target.value)}
            />
          </Field>
          <Field id="bk-rooms" label="Rooms *" error={fieldErrors.number_of_rooms}>
            <input
              id="bk-rooms"
              type="number"
              min={1}
              max={20}
              className={inputClass(fieldErrors.number_of_rooms)}
              value={form.number_of_rooms}
              onChange={(e) => update("number_of_rooms", e.target.value)}
              required
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onCheckAvailability}
            disabled={availabilityLoading || isLoading}
            className="inline-flex items-center justify-center gap-2 border border-gold/50 px-5 py-3 text-[11px] tracking-[0.22em] uppercase text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
          >
            {availabilityLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                Checking…
              </>
            ) : (
              "Check availability"
            )}
          </button>

          {availability && (
            <p
              className={`text-sm ${
                availability.ok && availability.available
                  ? "text-emerald-400/90"
                  : "text-gold"
              }`}
              role="status"
            >
              {availability.message}
            </p>
          )}
        </div>
      </section>

      <section className="border border-ink-line bg-ink-soft p-6 sm:p-8">
        <h2 className="font-display text-2xl text-cream">Booking options</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field id="bk-source" label="Source *" error={fieldErrors.booking_source}>
            <select
              id="bk-source"
              className={inputClass(fieldErrors.booking_source)}
              value={form.booking_source}
              onChange={(e) => update("booking_source", e.target.value)}
            >
              {ADMIN_CREATE_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {sourceLabel(src)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="bk-status" label="Status *" error={fieldErrors.booking_status}>
            <select
              id="bk-status"
              className={inputClass(fieldErrors.booking_status)}
              value={form.booking_status}
              onChange={(e) => update("booking_status", e.target.value)}
            >
              {ADMIN_CREATE_BOOKING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {sourceLabel(status)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="bk-payment" label="Payment *" error={fieldErrors.payment_status}>
            <select
              id="bk-payment"
              className={inputClass(fieldErrors.payment_status)}
              value={form.payment_status}
              onChange={(e) => update("payment_status", e.target.value)}
            >
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {sourceLabel(status)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          id="bk-notes"
          label="Booking notes"
          error={fieldErrors.special_requests}
          className="mt-5"
        >
          <textarea
            id="bk-notes"
            rows={4}
            className={inputClass(fieldErrors.special_requests)}
            value={form.special_requests}
            onChange={(e) => update("special_requests", e.target.value)}
            placeholder="Guest preferences, arrival notes… (stored as special_requests)"
            maxLength={2000}
          />
        </Field>
      </section>

      <section className="border border-ink-line bg-ink-soft p-6 sm:p-8">
        <h2 className="font-display text-2xl text-cream">Price summary</h2>
        <dl className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 border-b border-ink-line py-2 sm:col-span-2">
            <dt className="text-cream-muted">Stay</dt>
            <dd className="text-cream text-right">
              {form.check_in_date && form.check_out_date
                ? `${formatStayDate(form.check_in_date)} → ${formatStayDate(form.check_out_date)}`
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-ink-line py-2">
            <dt className="text-cream-muted">Nights</dt>
            <dd className="text-cream">{priceSummary?.nights ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-ink-line py-2">
            <dt className="text-cream-muted">Rooms</dt>
            <dd className="text-cream">{form.number_of_rooms || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-ink-line py-2">
            <dt className="text-cream-muted">Nightly rate</dt>
            <dd className="text-cream">
              {priceSummary?.onRequest
                ? "On request"
                : priceSummary?.nightlyRate != null
                  ? formatPrice(priceSummary.nightlyRate, currency)
                  : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-ink-line py-2">
            <dt className="text-cream-muted">Tax</dt>
            <dd className="text-cream">{formatPrice(0, currency)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2 sm:col-span-2">
            <dt className="text-[11px] tracking-[0.22em] uppercase text-gold">
              Indicative total
            </dt>
            <dd className="font-display text-2xl text-cream">
              {priceSummary?.onRequest
                ? "Price on request"
                : formatPrice(priceSummary?.total ?? 0, currency)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-cream-muted">
          Totals use the room type base price × nights × rooms. Tax remains 0 until
          a tax engine is added. Staff may adjust amounts on the booking detail
          after create.
        </p>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="submit"
          disabled={isLoading || availabilityLoading}
          className="inline-flex items-center justify-center gap-2 bg-gold px-8 py-3.5 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:bg-gold-soft disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              Creating…
            </>
          ) : (
            "Create booking"
          )}
        </button>
      </div>
    </form>
  );
}
