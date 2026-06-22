import Link from "next/link";
import { ArrowUpRight, MapPin, Star } from "lucide-react";
import { resolveCardImage } from "@/lib/images";
import { formatLocation } from "@/lib/format";
import { BRAND_DESCRIPTION } from "@/lib/brand";

export default function HotelCard({ hotel }) {
  const image = resolveCardImage(hotel);
  const location = formatLocation(hotel);
  const description = hotel.description || BRAND_DESCRIPTION;
  const tagline = hotel.tagline || "";

  return (
    <article className="group flex flex-col border border-ink-line bg-ink-soft overflow-hidden hover:border-gold/50 transition-colors">
      <Link href={`/hotels/${hotel.slug}`} className="relative aspect-[16/10] overflow-hidden">
        <img
          src={image}
          alt={hotel.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
        {hotel.is_featured && (
          <span className="absolute top-4 left-4 bg-gold text-cream text-[10px] tracking-[0.3em] uppercase px-3 py-1.5">
            Featured
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl text-cream">{hotel.name}</h3>
            {tagline && (
              <p className="mt-2 text-sm italic text-gold/90">{tagline}</p>
            )}
          </div>
          {hotel.star_rating && (
            <span className="inline-flex items-center gap-1 text-xs tracking-[0.2em] uppercase text-cream-muted shrink-0">
              <Star className="h-3.5 w-3.5 text-gold fill-gold" />
              {hotel.star_rating}★
            </span>
          )}
        </div>

        {location && (
          <p className="mt-4 inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-cream-muted">
            <MapPin className="h-3.5 w-3.5 text-gold shrink-0" />
            {location}
          </p>
        )}

        <p className="mt-4 text-sm leading-relaxed text-cream-dim flex-1 line-clamp-3">
          {description}
        </p>

        <Link
          href={`/hotels/${hotel.slug}`}
          className="mt-7 inline-flex items-center justify-between border-t border-ink-line pt-5 text-xs tracking-[0.25em] uppercase text-cream hover:text-gold transition-colors"
        >
          View Hotel
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>
    </article>
  );
}
