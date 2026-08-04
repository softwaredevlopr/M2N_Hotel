import { ChevronDown } from "lucide-react";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_HERO_IMAGE } from "@/lib/brand";

const HERO_SUBHEADING =
  "Discover premium stays across our growing collection of hotels with thoughtfully designed hospitality for business and leisure travellers.";

export default function BrandHero({ heroImage = BRAND_HERO_IMAGE }) {
  return (
    <section
      id="home"
      className="relative -mt-[68px] flex min-h-screen items-center justify-center overflow-hidden lg:-mt-[74px]"
    >
      <div
        className="absolute inset-0 bg-cover bg-center animate-hero-zoom"
        style={{ backgroundImage: `url(${heroImage})` }}
        aria-hidden
      />
      {/* Warm golden luxury tint + balanced darkening for readability. */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#3a1e05]/40 via-transparent to-transparent mix-blend-multiply"
        aria-hidden
      />
      <div className="absolute inset-0 bg-ink/60" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/45 to-ink"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/80 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-32 pb-24 text-center">
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="h-px w-12 bg-[#D71920]/45" />
          <span className="text-xs tracking-[0.45em] uppercase text-[#D83A42]">
            {BRAND_NAME}
          </span>
          <span className="h-px w-12 bg-[#D71920]/45" />
        </div>

        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[1.05] text-cream">
          {BRAND_TAGLINE}
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-base sm:text-lg leading-relaxed text-cream-dim">
          {HERO_SUBHEADING}
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#hotels"
            className="group inline-flex items-center justify-center bg-gold px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream hover:bg-gold-soft transition-colors w-full sm:w-auto"
          >
            Explore Hotels
          </a>
          <a
            href="/book"
            className="inline-flex items-center justify-center border border-cream/30 px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream hover:border-gold hover:text-gold transition-colors w-full sm:w-auto"
          >
            Book Your Stay
          </a>
        </div>
      </div>

      <a
        href="#hotels"
        aria-label="Scroll to our hotels"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-gold animate-float-down"
      >
        <span className="text-[10px] tracking-[0.4em] uppercase">Discover</span>
        <ChevronDown className="h-5 w-5" />
      </a>
    </section>
  );
}
