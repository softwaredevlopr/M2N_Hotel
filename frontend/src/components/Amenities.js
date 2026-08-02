import Reveal from "@/components/Reveal";
import { getHotelFacilities } from "@/lib/facilities";

export default function Amenities({ hotel, facilities = null }) {
  const items =
    Array.isArray(facilities) && facilities.length > 0
      ? facilities
      : getHotelFacilities(hotel);

  return (
    <section
      id="facilities"
      className="relative bg-ink py-28 sm:py-36 border-t border-ink-line"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Facilities
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
            Facilities &amp; Amenities
          </h2>
          <p className="mt-6 text-base leading-relaxed text-cream-dim">
            Thoughtful facilities curated for a calm, reliable stay
            {hotel?.name ? ` at ${hotel.name}` : ""}.
          </p>
        </div>

        <Reveal className="mt-16 grid grid-cols-2 gap-px border border-ink-line bg-ink-line sm:grid-cols-3 lg:grid-cols-5">
          {items.map(({ id, name, Icon }) => (
            <div
              key={id || name}
              className="group flex flex-col items-center gap-4 bg-ink p-8 text-center transition-colors duration-300 hover:bg-ink-soft"
            >
              <div className="flex h-14 w-14 items-center justify-center border border-gold/30 text-gold transition-all duration-300 group-hover:bg-gold group-hover:text-cream group-hover:scale-105">
                <Icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-base sm:text-lg text-cream leading-snug">
                {name}
              </h3>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
