"use client";

import { Loader2, X } from "lucide-react";
import {
  INVENTORY_DATE_SOURCES,
  dayHasCustomOverrideValues,
  dayHasPersistedOverride,
} from "@/lib/adminInventory";

const INPUT =
  "w-full bg-ink border px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:outline-none focus:border-gold transition-colors";
const LABEL =
  "block text-[11px] tracking-[0.25em] uppercase text-cream-muted mb-2";

function inputClass(hasError) {
  return `${INPUT} ${hasError ? "border-gold" : "border-ink-line"}`;
}

/**
 * Day-edit panel for sparse inventory-date overrides.
 * Writable fields only: allotment, stop_sell, overbooking_allowance, source.
 */
export default function InventoryDayEditPanel({
  open,
  hotelName,
  roomTypeName,
  inventoryDate,
  day,
  form,
  fieldErrors = {},
  formError = "",
  saving = false,
  clearing = false,
  onChange,
  onClose,
  onSave,
  onClearRequest,
}) {
  if (!open) return null;

  const busy = saving || clearing;
  const hasPersisted = dayHasPersistedOverride(day);
  const hasCustomValues = dayHasCustomOverrideValues(day);
  const physical = Number(day?.physical_total ?? day?.total_rooms) || 0;
  const sold = Number(day?.sold_count) || 0;
  const available = Number(day?.available_rooms ?? day?.remaining_count) || 0;
  const sellLimit = Number(day?.sell_limit);
  const hasSellLimit = Number.isFinite(sellLimit);

  let stateLabel = "No persisted override — using default availability.";
  let stateClass = "text-cream-muted";
  if (hasPersisted && hasCustomValues) {
    stateLabel = "Persisted custom override for this night.";
    stateClass = "text-gold";
  } else if (hasPersisted) {
    stateLabel =
      "Persisted override row with default values (same maths as no row).";
    stateClass = "text-cream-dim";
  }

  function update(field, value) {
    onChange({ ...form, [field]: value });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-ink/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-day-edit-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close day editor"
        disabled={busy}
        onClick={() => (!busy ? onClose() : null)}
      />

      <aside className="relative z-[81] flex h-full w-full max-w-md flex-col border-l border-ink-line bg-ink-soft shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-ink-line px-6 py-5">
          <div>
            <span className="text-[10px] tracking-[0.28em] uppercase text-gold">
              Day override
            </span>
            <h2
              id="inventory-day-edit-title"
              className="mt-2 font-display text-2xl text-cream"
            >
              {inventoryDate || "—"}
            </h2>
            <p className="mt-2 text-sm text-cream-dim">
              {hotelName || "Hotel"} · {roomTypeName || "Room type"}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center border border-cream/30 text-cream transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="border border-ink-line bg-ink p-4">
            <div className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
              Live snapshot
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-cream-dim">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.18em] text-cream-muted">
                  Physical
                </dt>
                <dd className="mt-1 text-cream">{physical}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.18em] text-cream-muted">
                  Sold
                </dt>
                <dd className="mt-1 text-cream">{sold}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.18em] text-cream-muted">
                  Available
                </dt>
                <dd className="mt-1 text-cream">{available}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.18em] text-cream-muted">
                  Sell limit
                </dt>
                <dd className="mt-1 text-cream">
                  {hasSellLimit ? sellLimit : "—"}
                </dd>
              </div>
            </dl>
            <p className={`mt-4 text-xs ${stateClass}`}>{stateLabel}</p>
          </div>

          {formError ? (
            <div
              role="alert"
              className="mt-5 border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
            >
              {formError}
            </div>
          ) : null}

          <form
            id="inventory-day-edit-form"
            className="mt-6 space-y-5"
            onSubmit={onSave}
            noValidate
          >
            <div>
              <label htmlFor="inv-allotment" className={LABEL}>
                Allotment
              </label>
              <input
                id="inv-allotment"
                type="number"
                min={0}
                max={32767}
                step={1}
                inputMode="numeric"
                placeholder={`Leave blank = physical (${physical})`}
                value={form.allotment ?? ""}
                disabled={busy}
                onChange={(e) => update("allotment", e.target.value)}
                className={inputClass(Boolean(fieldErrors.allotment))}
                aria-invalid={Boolean(fieldErrors.allotment)}
              />
              {fieldErrors.allotment ? (
                <p className="mt-1.5 text-xs text-gold">{fieldErrors.allotment}</p>
              ) : (
                <p className="mt-1.5 text-xs text-cream-muted">
                  Blank uses physical sellable rooms for this night.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="inv-overbooking" className={LABEL}>
                Overbooking allowance
              </label>
              <input
                id="inv-overbooking"
                type="number"
                min={0}
                max={32767}
                step={1}
                inputMode="numeric"
                value={form.overbooking_allowance ?? 0}
                disabled={busy}
                onChange={(e) =>
                  update("overbooking_allowance", e.target.value)
                }
                className={inputClass(
                  Boolean(fieldErrors.overbooking_allowance)
                )}
                aria-invalid={Boolean(fieldErrors.overbooking_allowance)}
              />
              {fieldErrors.overbooking_allowance ? (
                <p className="mt-1.5 text-xs text-gold">
                  {fieldErrors.overbooking_allowance}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="inv-source" className={LABEL}>
                Source
              </label>
              <select
                id="inv-source"
                value={form.source || "manual"}
                disabled={busy}
                onChange={(e) => update("source", e.target.value)}
                className={inputClass(Boolean(fieldErrors.source))}
                aria-invalid={Boolean(fieldErrors.source)}
              >
                {INVENTORY_DATE_SOURCES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {fieldErrors.source ? (
                <p className="mt-1.5 text-xs text-gold">{fieldErrors.source}</p>
              ) : null}
            </div>

            <label className="flex items-start gap-3 border border-ink-line bg-ink px-4 py-3">
              <input
                id="inv-stop-sell"
                type="checkbox"
                checked={Boolean(form.stop_sell)}
                disabled={busy}
                onChange={(e) => update("stop_sell", e.target.checked)}
                className="mt-1 h-4 w-4 accent-gold"
              />
              <span>
                <span className="block text-[11px] tracking-[0.22em] uppercase text-cream">
                  Stop sell
                </span>
                <span className="mt-1 block text-xs text-cream-dim">
                  Blocks bookings for this night regardless of remaining rooms.
                </span>
              </span>
            </label>
          </form>
        </div>

        <div className="border-t border-ink-line px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            {hasPersisted ? (
              <button
                type="button"
                disabled={busy}
                onClick={onClearRequest}
                className="inline-flex items-center justify-center border border-rose-400/40 px-5 py-3 text-[11px] tracking-[0.22em] uppercase text-rose-200 transition-colors hover:border-rose-300 hover:text-rose-100 disabled:opacity-50"
              >
                {clearing ? (
                  <>
                    <Loader2
                      className="mr-2 h-3.5 w-3.5 animate-spin"
                      strokeWidth={2}
                    />
                    Clearing…
                  </>
                ) : (
                  "Clear override"
                )}
              </button>
            ) : (
              <p className="self-center text-xs text-cream-muted">
                Nothing to clear — no override row for this date.
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="inline-flex items-center justify-center border border-cream/30 px-5 py-3 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="inventory-day-edit-form"
                disabled={busy}
                className="inline-flex items-center justify-center bg-gold px-6 py-3 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2
                      className="mr-2 h-3.5 w-3.5 animate-spin"
                      strokeWidth={2}
                    />
                    Saving…
                  </>
                ) : (
                  "Save override"
                )}
              </button>
            </div>
          </div>
          {hasPersisted ? (
            <p className="mt-3 text-xs text-cream-muted">
              Clearing deletes the override row so availability falls back to
              physical rooms minus blocking bookings.
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
