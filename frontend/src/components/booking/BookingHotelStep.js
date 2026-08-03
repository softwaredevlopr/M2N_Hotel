"use client";

import { Check, MapPin, Star } from "lucide-react";
import { formatLocation, formatPrice } from "@/lib/format";

function startingRate(roomTypes = []) {
  const prices = roomTypes
    .map((roomType) => Number(roomType?.base_price))
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

export default function BookingHotelStep({
  hotels,
  roomTypesByHotel,
  hotelImages,
  selectedSlug,
  onSelect,
}) {
  if (hotels.length === 0) {
    return (
      <p className="border border-ink-line bg-ink-soft p-8 text-center text-sm tracking-[0.2em] uppercase text-cream-muted">
        Hotels will appear here once available.
      </p>
    );
  }

  return (
    <fieldset>
      <legend className="sr-only">Select a hotel</legend>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {hotels.map((hotel) => {
          const isSelected = hotel.slug === selectedSlug;
          const location = formatLocation(hotel);
          const from = startingRate(roomTypesByHotel[hotel.slug]);

          return (
            <button
              key={hotel.id || hotel.slug}
              type="button"
              onClick={() => onSelect(hotel.slug)}
              aria-pressed={isSelected}
              className={`group flex flex-col overflow-hidden border text-left transition-colors ${
                isSelected
                  ? "border-gold bg-ink-elevated"
                  : "border-ink-line bg-ink-soft hover:border-gold/50"
              }`}
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={hotelImages[hotel.slug]}
                  alt={`${hotel.name}${location ? ` — ${location}` : ""}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                {isSelected && (
                  <span className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center bg-gold text-cream">
                    <Check className="h-4 w-4" strokeWidth={2} />
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-xl text-cream sm:text-2xl">
                    {hotel.name}
                  </h3>
                  {hotel.star_rating && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs tracking-[0.2em] uppercase text-cream-muted">
                      <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                      {hotel.star_rating}★
                    </span>
                  )}
                </div>

                {location && (
                  <p className="mt-3 inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-cream-muted">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-gold" />
                    {location}
                  </p>
                )}

                <p className="mt-4 flex-1 text-sm leading-relaxed text-cream-dim line-clamp-2">
                  {hotel.tagline || hotel.description}
                </p>

                <p className="mt-5 border-t border-ink-line pt-4 text-xs tracking-[0.25em] uppercase text-gold">
                  {from
                    ? `From ${formatPrice(from, hotel.currency_code || "INR")} / night`
                    : "Rates on request"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
