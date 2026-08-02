import {
  ShieldCheck,
  BedDouble,
  MapPin,
  Headset,
  Sparkles,
  Building2,
} from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

const REASONS = [
  {
    icon: ShieldCheck,
    title: "Trusted Hospitality",
    description:
      "Dependable service and consistent standards you can rely on at every M2N property.",
  },
  {
    icon: BedDouble,
    title: "Comfortable Stay",
    description:
      "Clean, well-kept rooms and modern comfort designed for a restful stay.",
  },
  {
    icon: MapPin,
    title: "Prime Locations",
    description:
      "Conveniently located hotels that keep you close to what matters most.",
  },
  {
    icon: Headset,
    title: "24×7 Support",
    description:
      "A responsive team ready to assist you before, during, and after your stay.",
  },
  {
    icon: Sparkles,
    title: "Premium Experience",
    description:
      "Thoughtful touches and warm hospitality that make every visit feel special.",
  },
  {
    icon: Building2,
    title: "Growing Hotel Network",
    description:
      "An expanding collection of hotels united by one promise of quality and care.",
  },
];

export default function WhyChooseM2N() {
  return (
    <section
      id="why-choose"
      className="relative bg-ink py-28 sm:py-36 border-t border-ink-line"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Why Choose Us
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
            Why Choose {BRAND_NAME}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-cream-dim">
            The reasons guests return to us, stay after stay.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-px bg-gold/20 border border-gold/20 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map((reason) => {
            const Icon = reason.icon;
            return (
              <div key={reason.title} className="bg-ink p-8">
                <div className="flex h-12 w-12 items-center justify-center border border-gold/40 text-gold">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="mt-6 font-display text-xl text-cream">
                  {reason.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                  {reason.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
