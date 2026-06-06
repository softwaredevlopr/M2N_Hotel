import { Award, Sparkles, Crown } from "lucide-react";
import { resolveMediaUrl } from "@/lib/images";
import { padNumber } from "@/lib/format";

import {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_DESCRIPTION,
} from "@/lib/brand";

const PILLARS = [
  {
    icon: Crown,
    title: "Thoughtful Comfort",
    description:
      "Well-appointed rooms and calm interiors designed for restful, modern stays.",
  },
  {
    icon: Sparkles,
    title: "Attentive Service",
    description:
      "A dedicated team focused on smooth arrivals, responsive care, and guest comfort.",
  },
  {
    icon: Award,
    title: "Reliable Hospitality",
    description:
      "Consistent standards and warm welcomes across every M2N Hotels stay.",
  },
];

function deriveStats({ hotel, roomTypeCount }) {
  const stats = [];

  if (hotel?.star_rating) {
    stats.push({
      label: "Star Rated",
      value: padNumber(hotel.star_rating),
      suffix: "★",
    });
  }
  if (roomTypeCount > 0) {
    stats.push({
      label: "Room Categories",
      value: padNumber(roomTypeCount),
    });
  }
  if (Array.isArray(hotel?.amenities) && hotel.amenities.length > 0) {
    stats.push({
      label: "Amenities",
      value: padNumber(hotel.amenities.length),
    });
  }

  return stats.slice(0, 3);
}

function splitDescription(text) {
  if (!text || typeof text !== "string") {
    return [BRAND_DESCRIPTION, ""];
  }
  const sentences = text.split(/(?<=\.)\s+/).filter(Boolean);
  if (sentences.length <= 1) return [text, ""];
  const mid = Math.ceil(sentences.length / 2);
  return [sentences.slice(0, mid).join(" "), sentences.slice(mid).join(" ")];
}

function buildHeadline(hotel) {
  if (hotel?.name) {
    return (
      <>
        {hotel.name}
        <br />
        <span className="italic text-gold">
          {hotel.tagline || BRAND_TAGLINE}
        </span>
      </>
    );
  }
  return (
    <>
      {BRAND_NAME}
      <br />
      <span className="italic text-gold">{BRAND_TAGLINE}</span>
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

  const gmQuote = hotel?.metadata?.gm_quote;
  const gmName = hotel?.metadata?.gm_name;

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
            {secondaryDescription && (
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-cream-dim">
                {secondaryDescription}
              </p>
            )}

            {stats.length > 0 && (
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
            )}
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden">
              <img
                src={aboutImage}
                alt={`${hotel?.name || BRAND_NAME} interior`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 ring-1 ring-gold/30" />
            </div>
            {gmQuote && (
              <div className="absolute -bottom-6 -left-6 hidden md:block border border-accent/50 bg-ink p-6 max-w-xs">
                <div className="text-xs tracking-[0.3em] uppercase text-accent">
                  Concierge Promise
                </div>
                <p className="mt-3 font-display text-xl leading-snug text-cream">
                  &ldquo;{gmQuote}&rdquo;
                </p>
                {gmName && (
                  <div className="mt-3 text-xs tracking-[0.2em] uppercase text-cream-muted">
                    — {gmName}
                  </div>
                )}
              </div>
            )}
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
