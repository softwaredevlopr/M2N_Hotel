import { Star, Quote } from "lucide-react";

/**
 * Guest reviews section. Renders a premium empty state until reviews are
 * available from the API — does not invent fake guest testimonials.
 */
export default function GuestReviews({ hotel, reviews = [] }) {
  const items = Array.isArray(reviews) ? reviews.filter(Boolean) : [];
  const hotelName = hotel?.name || "this hotel";

  return (
    <section
      id="reviews"
      className="relative bg-ink-soft py-28 sm:py-36 border-y border-ink-line"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Guest Reviews
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
            What Guests Say
          </h2>
          <p className="mt-6 text-base leading-relaxed text-cream-dim">
            Honest feedback from travellers who have stayed at {hotelName}.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="mx-auto mt-16 max-w-xl border border-ink-line bg-ink px-8 py-14 text-center">
            <Quote className="mx-auto h-8 w-8 text-gold/50" strokeWidth={1.5} />
            <p className="mt-6 text-sm leading-relaxed text-cream-dim">
              Guest reviews will appear here once available. We look forward to
              welcoming you and hearing about your stay.
            </p>
          </div>
        ) : (
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((review, index) => (
              <article
                key={review.id || `${review.author}-${index}`}
                className="border border-ink-line bg-ink p-8"
              >
                {review.rating != null && (
                  <div className="flex items-center gap-1 text-gold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < Number(review.rating)
                            ? "fill-gold text-gold"
                            : "text-ink-line"
                        }`}
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>
                )}
                {review.text && (
                  <p className="mt-5 text-sm leading-relaxed text-cream-dim">
                    “{review.text}”
                  </p>
                )}
                {review.author && (
                  <p className="mt-6 text-[11px] tracking-[0.25em] uppercase text-cream-muted">
                    {review.author}
                    {review.date ? ` · ${review.date}` : ""}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
