import Link from "next/link";
import {
  BedDouble,
  Users,
  Maximize2,
  Check,
  Wifi,
  Wind,
  Tv,
  BellRing,
  Sparkles,
  Coffee,
  Bath,
  Star,
  Clock,
  UtensilsCrossed,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import Reveal from "@/components/Reveal";
import { resolveRoomTypeImage } from "@/lib/images";
import {
  ON_REQUEST,
  getHotelTariff,
  getRoomStartingPrice,
  getRoomHighlights,
  getRoomAmenities,
  getRoomPackage,
} from "@/lib/tariffs";

import {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_DESCRIPTION,
} from "@/lib/brand";

function pickRoomTypes(roomTypes, hotel) {
  if (!Array.isArray(roomTypes) || roomTypes.length === 0) {
    return [];
  }
  return [...roomTypes]
    .sort((a, b) => {
      const orderA = Number(a.sort_order) || 0;
      const orderB = Number(b.sort_order) || 0;
      if (orderA !== orderB) return orderA - orderB;
      const priceA = getRoomStartingPrice(hotel, a);
      const priceB = getRoomStartingPrice(hotel, b);
      if (priceA == null && priceB == null) return 0;
      if (priceA == null) return 1;
      if (priceB == null) return -1;
      return priceA - priceB;
    })
    .slice(0, 4);
}

function formatOccupancy(count) {
  if (!Number.isFinite(Number(count))) return "—";
  const n = Number(count);
  return n === 1 ? "1 Guest" : `${n} Guests`;
}

function formatSize(sqft) {
  if (!sqft) return "—";
  return `${sqft} sq ft`;
}

// Map a free-text amenity label to a matching icon (falls back to Sparkles).
const AMENITY_ICON_RULES = [
  { test: /wi.?fi|internet/i, icon: Wifi },
  { test: /air.?condition|\bac\b|cooling/i, icon: Wind },
  { test: /\btv\b|television|smart tv/i, icon: Tv },
  { test: /room service|front desk|24/i, icon: BellRing },
  { test: /tea|coffee/i, icon: Coffee },
  { test: /bath|toiletr|shower/i, icon: Bath },
  { test: /housekeep|clean/i, icon: Sparkles },
];

function amenityIcon(label) {
  const match = AMENITY_ICON_RULES.find((rule) => rule.test.test(label));
  return match ? match.icon : Sparkles;
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-gold">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
        <span className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
          {label}
        </span>
      </div>
      <span className="font-display text-lg text-cream leading-tight">
        {value}
      </span>
    </div>
  );
}

export default function FeaturedRooms({
  hotel,
  roomTypes = [],
  currencyCode = "INR",
}) {
  const tariff = getHotelTariff(hotel);
  const displayCurrency = tariff?.currencyCode || currencyCode;
  const unavailable = tariff?.unavailableLabel || ON_REQUEST;
  const items = pickRoomTypes(roomTypes, hotel);
  const featuredIndex = items.length > 1 ? 1 : -1;
  const sectionTitle = hotel?.name || BRAND_NAME;

  return (
    <section id="rooms" className="relative bg-ink py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16 lg:mb-24">
          <div>
            <span className="text-xs tracking-[0.45em] uppercase text-gold">
              Rooms &amp; Suites
            </span>
            <div className="gold-divider mt-5" />
            <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
              {sectionTitle}
              <br />
              <span className="italic text-gold">
                {hotel?.tagline || BRAND_TAGLINE}
              </span>
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-cream-dim lg:pb-2">
            {hotel?.description || BRAND_DESCRIPTION}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-sm tracking-[0.2em] uppercase text-cream-muted">
            Room details will appear here once available.
          </p>
        ) : (
          <div className="space-y-10 lg:space-y-16">
            {items.map((room, index) => {
              const isFeatured = index === featuredIndex;
              const imageLeft = index % 2 === 0;
              const image = resolveRoomTypeImage(room, index, hotel);
              const startingFrom = getRoomStartingPrice(hotel, room);
              const highlights = getRoomHighlights(hotel, room);
              const amenities = getRoomAmenities(hotel, room);
              const pkg = getRoomPackage(hotel, room);
              const isPackage = pkg?.priceUnit === "package";
              const occupancy = pkg?.occupancy || formatOccupancy(room.max_occupancy);
              const bedType = pkg?.bedType || room.bed_type || "—";
              const roomSizeVerified = Number(room.room_size_sqft) > 0;
              const description = pkg?.description || room.description;
              const food = pkg?.foodInclusions;
              const foodPlan = pkg?.foodPlan;
              // Avoid repeating a feature that already appears in the amenity strip.
              const amenityKeys = amenities.map((a) => a.toLowerCase());
              const highlightsForCard = highlights.filter(
                (h) =>
                  !amenityKeys.some(
                    (a) =>
                      a.includes(h.toLowerCase()) || h.toLowerCase().includes(a)
                  )
              );

              return (
                <Reveal
                  as="article"
                  key={room.id || room.slug || room.name}
                  className={`group grid grid-cols-1 overflow-hidden border bg-ink-soft lg:grid-cols-2 ${
                    isFeatured ? "border-gold/45" : "border-ink-line"
                  } hover:border-gold/60`}
                >
                  {/* Large room photo */}
                  <div
                    className={`relative min-h-[320px] overflow-hidden sm:min-h-[420px] lg:min-h-[560px] ${
                      imageLeft ? "lg:order-1" : "lg:order-2"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${room.name}${hotel?.name ? ` — ${hotel.name}` : ""}`}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-ink-soft/10 lg:via-transparent" />
                    {isFeatured && (
                      <span className="absolute top-6 left-6 inline-flex items-center gap-1.5 bg-gold px-3.5 py-1.5 text-[10px] tracking-[0.3em] uppercase text-cream">
                        <Star className="h-3 w-3 fill-cream" strokeWidth={0} />
                        Most Loved
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div
                    className={`flex flex-col p-8 sm:p-10 lg:p-14 ${
                      imageLeft ? "lg:order-2" : "lg:order-1"
                    }`}
                  >
                    <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl text-cream leading-tight">
                      {room.name}
                    </h3>

                    {/* Price */}
                    <div className="mt-5 flex items-baseline gap-2">
                      {startingFrom == null ? (
                        <span className="font-display text-2xl text-cream-muted">
                          {unavailable}
                        </span>
                      ) : (
                        <>
                          {!isPackage && (
                            <span className="text-[11px] tracking-[0.22em] uppercase text-cream-muted">
                              Starting from
                            </span>
                          )}
                          <span className="font-display text-3xl sm:text-4xl text-gold leading-none">
                            {formatPrice(startingFrom, displayCurrency)}
                          </span>
                          <span className="text-[11px] tracking-[0.18em] uppercase text-cream-muted">
                            {isPackage ? "/ package" : "/ night"}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Package / stay type */}
                    {pkg?.packageType && (
                      <span className="mt-4 inline-flex w-fit items-center gap-2 border border-gold/40 px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-gold">
                        {pkg.packageType}
                      </span>
                    )}

                    {description && (
                      <p className="mt-6 text-sm sm:text-base leading-relaxed text-cream-dim">
                        {description}
                      </p>
                    )}

                    {/* Occupancy · Bed Type · Duration · Room Size */}
                    <div className="mt-8 grid grid-cols-3 gap-4 border-y border-ink-line py-6">
                      <MetaItem
                        icon={Users}
                        label="Occupancy"
                        value={occupancy}
                      />
                      <MetaItem
                        icon={BedDouble}
                        label="Bed Type"
                        value={bedType}
                      />
                      {pkg?.duration ? (
                        <MetaItem
                          icon={Clock}
                          label="Duration"
                          value={pkg.duration}
                        />
                      ) : (
                        // Rooms without a duration keep the Room Size slot (shows
                        // a verified value, or "—" when the size is unknown).
                        <MetaItem
                          icon={Maximize2}
                          label="Room Size"
                          value={formatSize(room.room_size_sqft)}
                        />
                      )}
                      {/* Show Room Size alongside Duration only when verified. */}
                      {pkg?.duration && roomSizeVerified && (
                        <MetaItem
                          icon={Maximize2}
                          label="Room Size"
                          value={formatSize(room.room_size_sqft)}
                        />
                      )}
                    </div>

                    {/* Room Highlights */}
                    {highlightsForCard.length > 0 && (
                      <div className="mt-8">
                        <div className="text-[11px] tracking-[0.3em] uppercase text-gold">
                          Room Highlights
                        </div>
                        <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {highlightsForCard.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-2.5 text-sm text-cream-dim"
                            >
                              <Check
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold"
                                strokeWidth={1.5}
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Food / Package Inclusions */}
                    {(food || foodPlan || pkg?.foodNote) && (
                      <div className="mt-8">
                        <div className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-gold">
                          <UtensilsCrossed
                            className="h-3.5 w-3.5"
                            strokeWidth={1.5}
                          />
                          {foodPlan ? foodPlan.label : "Package Includes"}
                        </div>
                        {foodPlan ? (
                          <div className="mt-4">
                            <ul className="space-y-2.5">
                              {foodPlan.items.map((item) => (
                                <li
                                  key={item}
                                  className="flex items-start gap-2.5 text-sm text-cream"
                                >
                                  <Check
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold"
                                    strokeWidth={1.5}
                                  />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                            {foodPlan.note && (
                              <p className="mt-3 text-xs leading-relaxed text-cream-muted">
                                {foodPlan.note}
                              </p>
                            )}
                          </div>
                        ) : food ? (
                          <div className="mt-4 space-y-4">
                            {food.chooseOne?.length > 0 && (
                              <div>
                                <div className="text-xs tracking-[0.12em] uppercase text-cream-muted">
                                  Choice of any one
                                </div>
                                <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                  {food.chooseOne.map((item) => (
                                    <li
                                      key={item}
                                      className="flex items-start gap-2.5 text-sm text-cream-dim"
                                    >
                                      <Check
                                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold"
                                        strokeWidth={1.5}
                                      />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {food.included?.length > 0 && (
                              <ul className="space-y-2.5 border-t border-ink-line pt-4">
                                {food.included.map((item) => (
                                  <li
                                    key={item}
                                    className="flex items-start gap-2.5 text-sm text-cream"
                                  >
                                    <Check
                                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold"
                                      strokeWidth={1.5}
                                    />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : (
                          <p className="mt-4 text-sm leading-relaxed text-cream-dim">
                            {pkg.foodNote}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Amenities */}
                    {amenities.length > 0 && (
                      <div className="mt-8">
                        <div className="text-[11px] tracking-[0.3em] uppercase text-gold">
                          Amenities
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2.5">
                          {amenities.map((item) => {
                            const Icon = amenityIcon(item);
                            return (
                              <span
                                key={item}
                                className="inline-flex items-center gap-2 border border-ink-line bg-ink px-3.5 py-2 text-xs text-cream-dim"
                              >
                                <Icon
                                  className="h-3.5 w-3.5 text-gold"
                                  strokeWidth={1.5}
                                />
                                {item}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                      <a
                        href="#tariff"
                        className="inline-flex flex-1 items-center justify-center border border-cream/30 px-7 py-4 text-xs tracking-[0.25em] uppercase text-cream transition-colors hover:border-gold hover:text-gold"
                      >
                        View Tariff
                      </a>
                      <Link
                        href={`/book?hotel=${encodeURIComponent(
                          hotel?.slug || ""
                        )}&room=${encodeURIComponent(room.slug || "")}`}
                        className="inline-flex flex-1 items-center justify-center bg-gold px-7 py-4 text-xs tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
