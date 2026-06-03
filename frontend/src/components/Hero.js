import { ChevronDown, MapPin } from "lucide-react";
import { resolveHeroImage } from "@/lib/images";
import { formatShortAddress } from "@/lib/format";

const DEFAULT_HEADLINE_MAIN = "Royal Stays Beyond";
const DEFAULT_HEADLINE_ACCENT = "Walls of Time";
const DEFAULT_DESCRIPTION =
  "At M2N Hotels, heritage craft meets quiet modern luxury — rooftop dining beneath open skies, curated journeys, and warm welcomes at every arrival.";

function splitTagline(tagline) {
  if (!tagline || typeof tagline !== "string") {
    return { main: DEFAULT_HEADLINE_MAIN, accent: DEFAULT_HEADLINE_ACCENT };
  }
  const commaIndex = tagline.indexOf(",");
  if (commaIndex > 0) {
    return {
      main: tagline.slice(0, commaIndex).trim(),
      accent: tagline.slice(commaIndex + 1).trim(),
    };
  }
  return { main: DEFAULT_HEADLINE_MAIN, accent: tagline.trim() };
}

function buildEyebrow(hotel) {
  if (!hotel) return "M2N Hotels · Boutique Luxury";
  if (hotel.city) return `${hotel.name} · ${hotel.city}`;
  return hotel.name;
}

export default function Hero({ hotel }) {
  const heroImage = resolveHeroImage(hotel);
  const { main, accent } = splitTagline(hotel?.tagline);
  const description = hotel?.description || DEFAULT_DESCRIPTION;
  const eyebrow = buildEyebrow(hotel);
  const address = formatShortAddress(hotel);

  return (
    <section
      id="home"
      className="relative -mt-[68px] flex min-h-screen items-center justify-center overflow-hidden lg:-mt-[74px]"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/65 to-ink"
        aria-hidden
      />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/90 to-transparent" aria-hidden />

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-32 pb-24 text-center">
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="h-px w-12 bg-[#D71920]/45" />
          <span className="text-xs tracking-[0.45em] uppercase text-[#D83A42]">
            {eyebrow}
          </span>
          <span className="h-px w-12 bg-[#D71920]/45" />
        </div>

        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[1.05] text-cream">
          {main}
          <br />
          <span className="text-[#E94A57]">{accent}</span>
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-base sm:text-lg leading-relaxed text-cream-dim">
          {description}
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#contact"
            className="group inline-flex items-center justify-center bg-gold px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream hover:bg-gold-soft transition-colors w-full sm:w-auto"
          >
            Book Your Stay
          </a>
          <a
            href="#rooms"
            className="inline-flex items-center justify-center border border-cream/30 px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream hover:border-gold hover:text-gold transition-colors w-full sm:w-auto"
          >
            Explore Rooms
          </a>
        </div>

        {address && (
          <div className="mt-10 flex items-center justify-center gap-2 text-xs tracking-[0.3em] uppercase text-cream-muted text-center">
            <MapPin className="h-3.5 w-3.5 text-gold flex-shrink-0" />
            <span>{address}</span>
          </div>
        )}
      </div>

      <a
        href="#about"
        aria-label="Scroll to about"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-gold animate-float-down"
      >
        <span className="text-[10px] tracking-[0.4em] uppercase">Discover</span>
        <ChevronDown className="h-5 w-5" />
      </a>
    </section>
  );
}
