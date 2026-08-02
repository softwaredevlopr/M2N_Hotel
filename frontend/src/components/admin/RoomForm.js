"use client";

import { Loader2 } from "lucide-react";
import { ROOM_STATUSES } from "@/lib/adminRooms";

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
 * Room create/edit form — fields match rooms table columns only.
 */
export default function RoomForm({
  form,
  hotels = [],
  roomTypes = [],
  onChange,
  onSubmit,
  submitLabel = "Save",
  isLoading = false,
  errorMessage = "",
  fieldErrors = {},
}) {
  function update(field, value) {
    const next = { ...form, [field]: value };
    // Changing hotel clears room type if it no longer belongs to that hotel.
    if (field === "hotel_id") {
      const stillValid = roomTypes.some(
        (rt) => rt.id === form.room_type_id && rt.hotel_id === value
      );
      if (!stillValid) next.room_type_id = "";
    }
    onChange(next);
  }

  const filteredTypes = form.hotel_id
    ? roomTypes.filter((rt) => rt.hotel_id === form.hotel_id)
    : roomTypes;

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
        <h2 className="font-display text-2xl text-cream">Room Details</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="room-hotel"
            label="Hotel *"
            error={fieldErrors.hotel_id}
            className="sm:col-span-2"
          >
            <select
              id="room-hotel"
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
            id="room-type"
            label="Room type *"
            error={fieldErrors.room_type_id}
            className="sm:col-span-2"
          >
            <select
              id="room-type"
              className={inputClass(fieldErrors.room_type_id)}
              value={form.room_type_id}
              onChange={(e) => update("room_type_id", e.target.value)}
              aria-invalid={Boolean(fieldErrors.room_type_id)}
              required
              disabled={!form.hotel_id}
            >
              <option value="">
                {form.hotel_id ? "Select room type…" : "Select a hotel first…"}
              </option>
              {filteredTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="room-number"
            label="Room number *"
            error={fieldErrors.room_number}
          >
            <input
              id="room-number"
              className={inputClass(fieldErrors.room_number)}
              value={form.room_number}
              onChange={(e) => update("room_number", e.target.value)}
              aria-invalid={Boolean(fieldErrors.room_number)}
              required
            />
          </Field>

          <Field
            id="room-floor"
            label="Floor label"
            error={fieldErrors.floor_label}
          >
            <input
              id="room-floor"
              className={inputClass(fieldErrors.floor_label)}
              value={form.floor_label}
              onChange={(e) => update("floor_label", e.target.value)}
              placeholder="Ground, 1st Floor…"
            />
          </Field>

          <Field id="room-status" label="Status" error={fieldErrors.status}>
            <select
              id="room-status"
              className={inputClass(fieldErrors.status)}
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              {ROOM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="room-notes"
            label="Notes"
            error={fieldErrors.notes}
            className="sm:col-span-2"
          >
            <textarea
              id="room-notes"
              rows={3}
              className={`${inputClass(fieldErrors.notes)} resize-y`}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </Field>
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
