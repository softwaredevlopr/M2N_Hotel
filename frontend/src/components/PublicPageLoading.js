export default function PublicPageLoading({ label = "Loading" }) {
  return (
    <div className="min-h-screen bg-ink">
      <div className="mx-auto max-w-7xl px-6 py-32 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto h-3 w-24 animate-pulse bg-gold/30" />
          <div className="gold-divider mx-auto mt-5 opacity-40" />
          <div className="mx-auto mt-10 h-12 w-3/4 animate-pulse bg-ink-soft" />
          <div className="mx-auto mt-6 h-4 w-full animate-pulse bg-ink-soft" />
          <div className="mx-auto mt-3 h-4 w-5/6 animate-pulse bg-ink-soft" />
          <p className="mt-10 text-xs tracking-[0.35em] uppercase text-cream-muted">
            {label}
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="overflow-hidden border border-ink-line bg-ink-soft"
            >
              <div className="aspect-[16/10] animate-pulse bg-ink-line/60" />
              <div className="space-y-3 p-7">
                <div className="h-6 w-2/3 animate-pulse bg-ink-line/60" />
                <div className="h-4 w-full animate-pulse bg-ink-line/40" />
                <div className="h-4 w-4/5 animate-pulse bg-ink-line/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
