import { Award, Sparkles, Crown } from "lucide-react";
import { resolveMediaUrl } from "@/lib/images";
import { padNumber } from "@/lib/format";

const PILLARS = [
  {
    icon: Crown,
    title: "Boutique Heritage",
    description:
      "A restored haveli aesthetic with hand-carved details and frescoed ceilings.",
  },
  {
    icon: Sparkles,
    title: "Quiet Modern Luxury",
    description:
      "Calm interiors, layered lighting, and butler-led service that disappears when you need privacy.",
  },
  {
    icon: Award,
    title: "Awarded Hospitality",
    description:
      "Recognised by leading travel publications for craft and warmth.",
  },
];

const FALLBACK_DESCRIPTION_PRIMARY =
  "M2N Hotel was opened by a family of hoteliers who wanted to slow time for their guests. Today it remains intimate by design — a curated set of rooms, a quiet rooftop, and a team that remembers your tea.";

const FALLBACK_DESCRIPTION_SECONDARY =
  "We work with local artisans for our textiles, source produce from farms nearby, and curate every experience — from private sunrise walks to craft workshops with master makers.";

function deriveStats({ hotel, roomTypeCount }) {
  const established = 2018;
  const currentYear = new Date().getFullYear();
  const years = Math.max(currentYear - established, 1);

  const starRating = hotel?.star_rating ? padNumber(hotel.star_rating) : "04";
  const amenitiesCount =
    Array.isArray(hotel?.amenities) && hotel.amenities.length > 0
      ? padNumber(hotel.amenities.length)
      : "08";

  const categories = roomTypeCount > 0 ? padNumber(roomTypeCount) : "03";

  return [
    { label: "Years of Heritage", value: padNumber(years) },
    { label: "Room Categories", value: categories },
    { label: "Star Rated", value: starRating, suffix: "★" },
    { label: "Curated Amenities", value: amenitiesCount },
  ].slice(0, 3);
}

function splitDescription(text) {
  if (!text || typeof text !== "string") {
    return [FALLBACK_DESCRIPTION_PRIMARY, FALLBACK_DESCRIPTION_SECONDARY];
  }
  const sentences = text.split(/(?<=\.)\s+/).filter(Boolean);
  if (sentences.length <= 1) return [text, FALLBACK_DESCRIPTION_SECONDARY];
  const mid = Math.ceil(sentences.length / 2);
  return [sentences.slice(0, mid).join(" "), sentences.slice(mid).join(" ")];
}

function buildHeadline(hotel) {
  if (hotel?.city) {
    return (
      <>
        Where Old {hotel.city}
        <br />
        <span className="italic text-gold">whispers</span> to the new.
      </>
    );
  }
  return (
    <>
      Where heritage
      <br />
      <span className="italic text-gold">whispers</span> to the new.
    </>
  );
}

export default function About({ hotel, roomTypes = [] }) {
  const stats = deriveStats({ hotel, roomTypeCount: roomTypes.length });
  const [primaryDescription, secondaryDescription] = splitDescription(
    hotel?.description
  );

  const coverMedia = hotel?.media?.[1] ?? hotel?.media?.[0];
  const aboutImage = resolveMediaUrl(coverMedia, 1);

  const gmQuote =
    hotel?.metadata?.gm_quote ||
    "If you can imagine it, we'll arrange it.";
  const gmName = hotel?.metadata?.gm_name || "Aarav Singh, General Manager";

  return (
    <section id="about" className="relative bg-ink py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div>
            <span className="text-xs tracking-[0.45em] uppercase text-gold">
              The Story
            </span>
            <div className="gold-divider mt-5" />
            <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
              {buildHeadline(hotel)}
            </h2>
            <p className="mt-8 text-base sm:text-lg leading-relaxed text-cream-dim">
              {primaryDescription}
            </p>
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-cream-dim">
              {secondaryDescription}
            </p>

            <div className="mt-12 grid grid-cols-3 gap-6 border-y border-ink-line py-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="font-display text-3xl sm:text-4xl text-gold">
                    {stat.value}
                    {stat.suffix && (
                      <span className="ml-1 text-xl">{stat.suffix}</span>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] tracking-[0.25em] uppercase text-cream-muted">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden">
              <img
                src={aboutImage}
                alt={`${hotel?.name || "M2N Hotel"} interior`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 ring-1 ring-gold/30" />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden md:block border border-accent/50 bg-ink p-6 max-w-xs">
              <div className="text-xs tracking-[0.3em] uppercase text-accent">
                Concierge Promise
              </div>
              <p className="mt-3 font-display text-xl leading-snug text-cream">
                &ldquo;{gmQuote}&rdquo;
              </p>
              <div className="mt-3 text-xs tracking-[0.2em] uppercase text-cream-muted">
                — {gmName}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="group border border-ink-line bg-ink-soft p-8 hover:border-gold/40 transition-colors"
            >
              <pillar.icon className="h-7 w-7 text-gold" strokeWidth={1.5} />
              <h3 className="mt-5 font-display text-xl text-cream">
                {pillar.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
