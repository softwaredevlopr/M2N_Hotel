import { Sparkles, Building2, HeartHandshake } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

const POINTS = [
  {
    icon: Sparkles,
    title: "Premium Hospitality",
    description:
      "Warm, attentive service and modern comfort, maintained to a consistent standard across every property.",
  },
  {
    icon: Building2,
    title: "Growing Hotel Network",
    description:
      "A collection of hotels that keeps expanding under one shared promise of quality and care.",
  },
  {
    icon: HeartHandshake,
    title: "Guest First Experience",
    description:
      "Every detail is designed around our guests — from easy booking to a calm, reliable stay.",
  },
];

export default function BrandAbout() {
  return (
    <section id="about" className="relative bg-ink py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Who We Are
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
            About {BRAND_NAME}
          </h2>
          <p className="mt-8 text-base sm:text-lg leading-relaxed text-cream-dim">
            M2N Hotels is the guest-facing hospitality brand of Morning to Night
            Hotels Pvt Ltd, created to bring thoughtfully managed stays, warm
            service, and reliable comfort across a growing hotel network.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-px bg-gold/20 border border-gold/20 sm:grid-cols-3">
          {POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.title} className="bg-ink p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center border border-gold/40 text-gold">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="mt-6 font-display text-lg text-cream">
                  {point.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                  {point.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <a
            href="/about"
            className="inline-flex items-center justify-center border border-cream/30 px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream transition-colors hover:border-gold hover:text-gold"
          >
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}
