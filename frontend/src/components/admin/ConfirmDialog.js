"use client";

/**
 * Luxury dark confirmation dialog for destructive admin actions.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onCancel,
  children,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/80 px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md border border-ink-line bg-ink-soft p-8 shadow-2xl">
        <h2
          id="confirm-dialog-title"
          className="font-display text-2xl text-cream"
        >
          {title}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-cream-dim">{message}</p>
        {children}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex items-center justify-center border border-cream/30 px-6 py-3 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex items-center justify-center bg-gold px-6 py-3 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
