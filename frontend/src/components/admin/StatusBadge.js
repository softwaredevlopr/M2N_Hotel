const STYLES = {
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  available: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  draft: "border-cream/20 bg-ink text-cream-muted",
  inactive: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  occupied: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  maintenance: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  blocked: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  out_of_service: "border-ink-line bg-ink-elevated text-cream-muted",
  archived: "border-ink-line bg-ink-elevated text-cream-muted",
  // Booking statuses (Phase 10C)
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  confirmed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  checked_in: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  checked_out: "border-cream/20 bg-ink text-cream-muted",
  cancelled: "border-ink-line bg-ink-elevated text-cream-muted",
  no_show: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  unpaid: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  partial: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  paid: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  refunded: "border-ink-line bg-ink-elevated text-cream-muted",
  // Phase 14 finance ledger / invoice statuses
  issued: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  void: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  // Inquiry statuses (Phase 10H)
  contacted: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  quoted: "border-violet-500/40 bg-violet-500/10 text-violet-200",
  declined: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  // Tenant / subscription statuses (Phase 15 billing stub)
  trial: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  trialing: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  past_due: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  suspended: "border-amber-500/40 bg-amber-500/10 text-amber-200",
};

export default function StatusBadge({ status }) {
  const key = String(status || "").toLowerCase();
  const style = STYLES[key] || STYLES.draft;
  const label = status ? String(status).replace(/_/g, " ") : "—";

  return (
    <span
      className={`inline-flex border px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase ${style}`}
    >
      {label}
    </span>
  );
}
