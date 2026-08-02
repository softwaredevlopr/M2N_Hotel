import { MapPin, Navigation, LogIn, LogOut } from "lucide-react";
import {
  formatAddress,
  formatLocation,
  formatTimeOfDay,
} from "@/lib/format";
import { getMapsDirectionsUrl } from "@/lib/policies";

const LEGACY_MAPS_DIRECTIONS_BY_SLUG = {
  "hotel-zaarang-inn": "https://share.google/NTFmyy5F4jRkJJsmt",
  "m2n-hotel-aurelia-grand": "https://share.google/Kx6fMBgpImzHtj8lD",
};

// Address-based query for the map preview (share links are not embeddable).
function mapsEmbedUrl(query) {
  if (!query) return null;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
}

function resolveDirectionsUrl(hotel, previewQuery) {
  const fromApi = getMapsDirectionsUrl(hotel, previewQuery);
  if (fromApi) return fromApi;

  const slug = hotel?.slug;
  if (slug && LEGACY_MAPS_DIRECTIONS_BY_SLUG[slug]) {
    return LEGACY_MAPS_DIRECTIONS_BY_SLUG[slug];
  }

  return null;
}

function resolvePreviewQuery(hotel, fallbackAddress) {
  if (hotel?.name && fallbackAddress) {
    return `${hotel.name}, ${fallbackAddress}`;
  }
  return fallbackAddress || hotel?.name || null;
}

/**
 * Location section for a hotel detail page.
 * "Get Directions" uses the owner's exact share.google link when mapped, else a
 * Google Maps directions query. The embedded preview stays an address query.
 */
export default function HotelLocation({ hotel }) {
  const address = formatAddress(hotel);
  const location = formatLocation(hotel);
  if (!address && !location) return null;

  const displayAddress = address || location;
  const previewQuery = resolvePreviewQuery(hotel, displayAddress);
  const directionsHref = resolveDirectionsUrl(hotel, previewQuery);
  const embedSrc = mapsEmbedUrl(previewQuery);
  const checkIn = formatTimeOfDay(hotel?.check_in_time);
  const checkOut = formatTimeOfDay(hotel?.check_out_time);

  return (
    <section
      id="location"
      className="relative bg-ink py-28 sm:py-36 border-t border-ink-line"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Location
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
            Find Us
          </h2>
          <p className="mt-6 text-base leading-relaxed text-cream-dim">
            {hotel?.name
              ? `Visit ${hotel.name} and plan your arrival with ease.`
              : "Plan your arrival with ease."}
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.4fr] lg:gap-8">
          <div className="flex flex-col justify-center border border-ink-line bg-ink-soft p-8 sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center border border-gold/40 text-gold">
              <MapPin className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <h3 className="mt-6 font-display text-2xl sm:text-3xl text-cream">
              Address
            </h3>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-cream-dim">
              {displayAddress}
            </p>

            {(checkIn || checkOut) && (
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-ink-line pt-6">
                {checkIn && (
                  <div className="flex items-center gap-3">
                    <LogIn className="h-4 w-4 text-gold" strokeWidth={1.5} />
                    <div>
                      <div className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                        Check-in
                      </div>
                      <div className="font-display text-base text-cream">
                        {checkIn}
                      </div>
                    </div>
                  </div>
                )}
                {checkOut && (
                  <div className="flex items-center gap-3">
                    <LogOut className="h-4 w-4 text-gold" strokeWidth={1.5} />
                    <div>
                      <div className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                        Check-out
                      </div>
                      <div className="font-display text-base text-cream">
                        {checkOut}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {directionsHref && (
              <a
                href={directionsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-center gap-2 bg-gold px-8 py-4 text-xs tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft"
              >
                <Navigation className="h-4 w-4" strokeWidth={1.5} />
                Get Directions
              </a>
            )}
          </div>

          {embedSrc && (
            <div className="overflow-hidden border border-ink-line bg-ink-soft min-h-[340px] sm:min-h-[420px] lg:min-h-full">
              <iframe
                title={`Map — ${hotel?.name || "Hotel"}`}
                src={embedSrc}
                className="h-full min-h-[340px] w-full border-0 sm:min-h-[420px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
