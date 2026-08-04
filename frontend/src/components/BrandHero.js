import { ChevronDown } from "lucide-react";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

const HERO_SUBHEADING =
  "Discover premium stays across our growing collection of hotels with thoughtfully designed hospitality for business and leisure travellers.";

/**
 * Brand homepage hero. Intentionally photographic-free: hotel /Photos and
 * stock resort imagery must never appear here. Property photography belongs
 * on /hotels/[slug] (and hotel cards further down this page).
 */
export default function BrandHero() {
  return (
    <section
      id="home"
      className="relative -mt-[68px] flex min-h-screen items-center justify-center overflow-hidden lg:-mt-[74px]"
    >
      {/* Brand atmosphere only — no hotel or stock photography. */}
      <div className="absolute inset-0 bg-ink" aria-hidden />
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 60% at 50% 35%, rgba(215, 25, 32, 0.22), transparent 55%),
            radial-gradient(ellipse 50% 40% at 80% 80%, rgba(201, 162, 77, 0.12), transparent 50%),
            radial-gradient(ellipse 40% 35% at 15% 70%, rgba(215, 25, 32, 0.1), transparent 45%),
            linear-gradient(180deg, #0B0B0B 0%, #161616 45%, #0B0B0B 100%)
          `,
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/50 via-transparent to-ink"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/80 to-transparent"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-32 pb-24 text-center">
        <div className="mb-10 flex justify-center">
          <img
            src="/m2n-logo-tagline.png"
            alt={BRAND_NAME}
            width={320}
            height={120}
            className="h-auto w-[min(100%,20rem)] object-contain"
          />
        </div>

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
