// Shared field styling for the booking flow, matching the inquiry form so the
// two guest-facing forms stay visually identical.

export const BASE_INPUT_CLASS =
  "w-full bg-ink border px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:outline-none transition-colors";

export const LABEL_CLASS =
  "block text-[11px] tracking-[0.25em] uppercase text-cream-muted mb-2";

export function inputClass(hasError) {
  return `${BASE_INPUT_CLASS} ${
    hasError ? "border-gold focus:border-gold" : "border-ink-line focus:border-gold"
  }`;
}

export const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 bg-gold px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream hover:bg-gold-soft transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 border border-cream/30 px-7 py-4 text-xs tracking-[0.25em] uppercase text-cream hover:border-gold hover:text-gold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
