import {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_DESCRIPTION,
} from "@/lib/brand";

export default function BrandAbout() {
  return (
    <section id="about" className="relative bg-ink py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            About {BRAND_NAME}
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
            {BRAND_TAGLINE}
          </h2>
          <p className="mt-8 text-base sm:text-lg leading-relaxed text-cream-dim">
            {BRAND_DESCRIPTION}
          </p>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-cream-dim">
            {BRAND_NAME} brings together thoughtfully managed properties with
            consistent service, modern comfort, and warm hospitality for every
            guest.
          </p>
        </div>
      </div>
    </section>
  );
}
