"use client";

import { Loader2 } from "lucide-react";
import {
  MEAL_PLANS,
  OCCUPANCY_TYPES,
  TARIFF_STATUSES,
  AVAILABLE_WITH_ROOM_PLAN,
} from "@/lib/adminTariffs";

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

export default function TariffForm({
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
    onChange({ ...form, [field]: value });
  }

  const showNoteHint =
    form.price === "" || form.price === null || form.price === undefined;

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
        <h2 className="font-display text-2xl text-cream">Rate Details</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="tf-hotel"
            label="Hotel *"
            error={fieldErrors.hotel_id}
            className="sm:col-span-2"
          >
            <select
              id="tf-hotel"
              className={inputClass(fieldErrors.hotel_id)}
              value={form.hotel_id}
              onChange={(e) =>
                onChange({ ...form, hotel_id: e.target.value, room_type_id: "" })
              }
              required
            >
              <option value="">Select hotel</option>
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="tf-room-type"
            label="Room Type (optional)"
            error={fieldErrors.room_type_id}
            className="sm:col-span-2"
          >
            <select
              id="tf-room-type"
              className={inputClass(fieldErrors.room_type_id)}
              value={form.room_type_id}
              onChange={(e) => update("room_type_id", e.target.value)}
              disabled={!form.hotel_id}
            >
              <option value="">All room types (hotel meal matrix)</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="tf-meal-plan"
            label="Meal Plan *"
            error={fieldErrors.meal_plan}
          >
            <select
              id="tf-meal-plan"
              className={inputClass(fieldErrors.meal_plan)}
              value={form.meal_plan}
              onChange={(e) => update("meal_plan", e.target.value)}
              required
            >
              {MEAL_PLANS.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="tf-occupancy"
            label="Occupancy *"
            error={fieldErrors.occupancy}
          >
            <select
              id="tf-occupancy"
              className={inputClass(fieldErrors.occupancy)}
              value={form.occupancy}
              onChange={(e) => update("occupancy", e.target.value)}
              required
            >
              {OCCUPANCY_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>

          <Field id="tf-price" label="Price (INR)" error={fieldErrors.price}>
            <input
              id="tf-price"
              type="number"
              min="0"
              step="1"
              className={inputClass(fieldErrors.price)}
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="Leave empty for note-only cell"
            />
          </Field>

          <Field
            id="tf-display-note"
            label="Display note (when no price)"
            error={fieldErrors.display_note}
          >
            <input
              id="tf-display-note"
              type="text"
              className={inputClass(fieldErrors.display_note)}
              value={form.display_note}
              onChange={(e) => update("display_note", e.target.value)}
              placeholder={AVAILABLE_WITH_ROOM_PLAN}
            />
            {showNoteHint && (
              <p className="mt-2 text-xs text-cream-muted">
                Public site shows this note when price is empty (default:{" "}
                {AVAILABLE_WITH_ROOM_PLAN}).
              </p>
            )}
          </Field>

          <Field
            id="tf-valid-from"
            label="Valid from (seasonal)"
            error={fieldErrors.valid_from}
          >
            <input
              id="tf-valid-from"
              type="date"
              className={inputClass(fieldErrors.valid_from)}
              value={form.valid_from}
              onChange={(e) => update("valid_from", e.target.value)}
            />
          </Field>

          <Field
            id="tf-valid-to"
            label="Valid to (seasonal)"
            error={fieldErrors.valid_to}
          >
            <input
              id="tf-valid-to"
              type="date"
              className={inputClass(fieldErrors.valid_to)}
              value={form.valid_to}
              onChange={(e) => update("valid_to", e.target.value)}
            />
          </Field>

          <Field id="tf-status" label="Status" error={fieldErrors.status}>
            <select
              id="tf-status"
              className={inputClass(fieldErrors.status)}
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              {TARIFF_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="tf-sort-order"
            label="Sort order"
            error={fieldErrors.sort_order}
          >
            <input
              id="tf-sort-order"
              type="number"
              step="1"
              className={inputClass(fieldErrors.sort_order)}
              value={form.sort_order}
              onChange={(e) => update("sort_order", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 bg-gold px-8 py-4 text-xs tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft disabled:opacity-50"
        >
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          )}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
