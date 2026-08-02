import HotelCard from "./HotelCard";

export default function OurHotels({ hotels = [] }) {
  return (
    <section
      id="hotels"
      className="relative bg-ink-soft py-28 sm:py-36 border-y border-ink-line"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Our Hotels
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
            Explore Our Hotels
          </h2>
          <p className="mt-6 text-base leading-relaxed text-cream-dim">
            Explore our growing collection of hotels, each offering comfortable
            stays with modern hospitality.
          </p>
        </div>

        {hotels.length === 0 ? (
          <p className="mt-20 text-center text-sm tracking-[0.2em] uppercase text-cream-muted">
            Hotels will appear here once available.
          </p>
        ) : (
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotels.map((hotel) => (
              <HotelCard key={hotel.id || hotel.slug} hotel={hotel} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
