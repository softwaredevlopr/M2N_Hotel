import { Sparkles } from "lucide-react";
import { getAmenityIcon } from "@/lib/amenityIcons";
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_DESCRIPTION,
} from "@/lib/brand";

function pickAmenities(amenities) {
  if (!Array.isArray(amenities) || amenities.length === 0) {
    return [];
  }
  const highlighted = amenities.filter((item) => item.is_highlighted);
  const others = amenities.filter((item) => !item.is_highlighted);
  const ordered = [...highlighted, ...others];
  return ordered.slice(0, 8);
}

export default function Amenities({ hotel, amenities = [] }) {
  const items = pickAmenities(amenities);
  const sectionTitle = hotel?.name || BRAND_NAME;
  const sectionIntro = hotel?.description || BRAND_DESCRIPTION;

  return (
    <section
      id="amenities"
      className="relative bg-ink-soft py-28 sm:py-36 border-y border-ink-line"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Hotel Amenities
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
            {sectionTitle}
            <br />
            <span className="italic text-gold">
              {hotel?.tagline || BRAND_TAGLINE}
            </span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-cream-dim">
            {sectionIntro}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-cream-muted">
            <Sparkles className="h-8 w-8 text-gold/60" strokeWidth={1.5} />
            <p className="mt-4 text-sm tracking-[0.25em] uppercase">
              Amenities will appear here once available
            </p>
          </div>
        ) : (
          <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-ink-line">
            {items.map((item) => {
              const Icon = getAmenityIcon(item);
              return (
                <div
                  key={item.slug || item.name}
                  className="group bg-ink-soft p-8 hover:bg-ink transition-colors duration-300"
                >
                  <div className="flex h-12 w-12 items-center justify-center border border-gold/30 text-gold group-hover:bg-gold group-hover:text-ink transition-colors">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="mt-6 font-display text-xl text-cream">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                      {item.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
