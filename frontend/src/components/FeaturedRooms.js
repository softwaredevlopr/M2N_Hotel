import { BedDouble, Users, Maximize2, ArrowUpRight } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { resolveRoomTypeImage } from "@/lib/images";

const FALLBACK_ROOM_TYPES = [
  {
    slug: "standard-room",
    name: "Standard Room",
    description:
      "A serene retreat with queen bedding, soft linen, and warm afternoon light through carved arches.",
    base_price: 3499,
    max_occupancy: 2,
    bed_type: "Queen Bed",
    room_size_sqft: 180,
  },
  {
    slug: "deluxe-room",
    name: "Deluxe Room",
    description:
      "Spacious king-bedded room with a city-facing balcony, work desk, and curated minibar.",
    base_price: 5499,
    max_occupancy: 3,
    bed_type: "King Bed",
    room_size_sqft: 260,
  },
  {
    slug: "royal-suite",
    name: "Royal Suite",
    description:
      "Private living room, jacuzzi bath, butler call, and panoramic views towards the horizon.",
    base_price: 12499,
    max_occupancy: 4,
    bed_type: "King + Sofa Bed",
    room_size_sqft: 520,
  },
];

function pickRoomTypes(roomTypes) {
  if (!Array.isArray(roomTypes) || roomTypes.length === 0) {
    return FALLBACK_ROOM_TYPES;
  }
  return [...roomTypes]
    .sort((a, b) => {
      const orderA = Number(a.sort_order) || 0;
      const orderB = Number(b.sort_order) || 0;
      if (orderA !== orderB) return orderA - orderB;
      return Number(a.base_price) - Number(b.base_price);
    })
    .slice(0, 3);
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

export default function FeaturedRooms({ roomTypes = [], currencyCode = "INR" }) {
  const items = pickRoomTypes(roomTypes);
  const featuredIndex = items.length > 1 ? 1 : -1;

  return (
    <section id="rooms" className="relative bg-ink py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16">
          <div>
            <span className="text-xs tracking-[0.45em] uppercase text-gold">
              Featured Rooms
            </span>
            <div className="gold-divider mt-5" />
            <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
              Quiet rooms,
              <br />
              <span className="italic text-gold">grand mornings.</span>
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-cream-dim">
            Each room is dressed in hand-loomed cottons, lit by skilled
            artisans, and tuned for an unhurried stay. Rates include breakfast
            for two.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((room, index) => {
            const isFeatured = index === featuredIndex;
            const image = resolveRoomTypeImage(room);
            return (
              <article
                key={room.id || room.slug || room.name}
                className={`group relative flex flex-col border ${
                  isFeatured ? "border-gold/40" : "border-ink-line"
                } bg-ink-soft overflow-hidden hover:border-gold/60 transition-colors`}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={image}
                    alt={room.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                  {isFeatured && (
                    <span className="absolute top-4 left-4 bg-gold text-ink text-[10px] tracking-[0.3em] uppercase px-3 py-1.5">
                      Most Loved
                    </span>
                  )}
                  <div className="absolute bottom-4 right-4 bg-ink/85 backdrop-blur-sm border border-gold/30 px-3 py-1.5">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-cream-muted">
                      From
                    </span>
                    <div className="text-sm font-display text-gold">
                      {formatPrice(room.base_price, currencyCode)}
                      <span className="text-[10px] text-cream-muted ml-1 tracking-widest">
                        /night
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-7">
                  <h3 className="font-display text-2xl text-cream">
                    {room.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-cream-dim flex-1">
                    {room.description ||
                      "A signature M2N room with thoughtful touches and quiet luxury."}
                  </p>

                  <div className="mt-6 grid grid-cols-3 gap-4 text-[11px] tracking-[0.18em] uppercase text-cream-muted">
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <BedDouble className="h-4 w-4 text-gold" strokeWidth={1.5} />
                      {room.bed_type || "Bed"}
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center border-x border-ink-line">
                      <Users className="h-4 w-4 text-gold" strokeWidth={1.5} />
                      {formatOccupancy(room.max_occupancy)}
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <Maximize2 className="h-4 w-4 text-gold" strokeWidth={1.5} />
                      {formatSize(room.room_size_sqft)}
                    </div>
                  </div>

                  <a
                    href="#contact"
                    className="mt-7 inline-flex items-center justify-between border-t border-ink-line pt-5 text-xs tracking-[0.25em] uppercase text-cream hover:text-gold transition-colors"
                  >
                    View Details &amp; Book
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
