import { Compass, BedDouble, Sparkles, Building2, Cpu } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackendOfflineBanner from "@/components/BackendOfflineBanner";
import { getHotels } from "@/lib/api";
import {
  BRAND_NAME,
  BRAND_LEGAL_NAME,
  BRAND_TAGLINE,
  BRAND_DESCRIPTION,
} from "@/lib/brand";

export const revalidate = 60;

export const metadata = {
  title: `About ${BRAND_NAME}`,
  description: `${BRAND_LEGAL_NAME} — the hospitality group behind ${BRAND_NAME}. ${BRAND_DESCRIPTION}`,
  alternates: { canonical: "/about" },
};

const SECTIONS = [
  {
    icon: Compass,
    eyebrow: "Our Vision",
    title: "Hospitality, from morning to night",
    body: [
      `${BRAND_NAME} is the guest-facing brand of ${BRAND_LEGAL_NAME}. Our name reflects a simple promise — to look after every guest thoughtfully, from the first morning greeting to the last quiet hour of the night.`,
      "We believe great hospitality should feel consistent and dependable, whichever of our properties you choose. Our vision is to build a trusted collection of hotels known for warmth, comfort, and genuine care.",
    ],
  },
  {
    icon: BedDouble,
    eyebrow: "What We Offer",
    title: "Comfortable stays, made effortless",
    body: [
      "Thoughtfully designed rooms, modern amenities, and clean, well-kept spaces built around how guests actually travel — whether for family trips, business, or a short city break.",
      "Every property offers a straightforward booking inquiry experience, clear information, and a responsive team ready to help you plan the right stay.",
    ],
  },
  {
    icon: Sparkles,
    eyebrow: "Guest Experience",
    title: "Attentive service that feels personal",
    body: [
      "We focus on the details that matter most — a warm welcome, spotless rooms, comfortable beds, and staff who are happy to help.",
      "Our aim is a calm, reliable experience where guests feel looked after and leave wanting to return.",
    ],
  },
  {
    icon: Building2,
    eyebrow: "Growing Hotel Network",
    title: "A collection that keeps expanding",
    body: [
      `${BRAND_NAME} is a growing group of independently characterful properties operating under one shared standard of service and quality.`,
      "As we add new hotels, our commitment stays the same: consistent hospitality and a familiar sense of comfort across every location.",
    ],
  },
  {
    icon: Cpu,
    eyebrow: "Future Technology Platform",
    title: "Building a future digital hospitality platform",
    body: [
      "Behind the scenes, we are investing in technology to run our hotels more smoothly and make every guest interaction simpler.",
      "Over time, this will grow into a unified digital hospitality platform that connects our properties, streamlines bookings, and supports a consistent guest experience across the network.",
    ],
  },
];

export default async function AboutPage() {
  const hotels = await getHotels();
  const isOffline = !Array.isArray(hotels) || hotels.length === 0;
  const hotelCount = Array.isArray(hotels) ? hotels.length : 0;

  return (
    <>
      {isOffline && <BackendOfflineBanner />}
      <Navbar hotels={hotels} />
      <main className="bg-ink">
        <section className="relative border-b border-ink-line bg-ink py-28 sm:py-36">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
            <span className="text-xs tracking-[0.45em] uppercase text-gold">
              About {BRAND_NAME}
            </span>
            <div className="gold-divider mx-auto mt-5" />
            <h1 className="mt-8 font-display text-4xl leading-tight text-cream sm:text-5xl lg:text-6xl">
              {BRAND_TAGLINE}
            </h1>
            <p className="mt-6 text-base leading-relaxed text-cream-dim sm:text-lg">
              {BRAND_DESCRIPTION}
            </p>
            <p className="mt-5 text-sm tracking-[0.16em] uppercase text-cream-muted">
              A brand of {BRAND_LEGAL_NAME}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-6 py-24 lg:px-10 sm:py-28">
          <div className="space-y-20">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <section
                  key={section.eyebrow}
                  className="grid grid-cols-1 gap-8 md:grid-cols-[auto_1fr] md:gap-12"
                >
                  <div className="flex h-14 w-14 items-center justify-center border border-gold/40 text-gold">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <div>
                    <span className="text-xs tracking-[0.35em] uppercase text-gold">
                      {section.eyebrow}
                    </span>
                    <h2 className="mt-4 font-display text-3xl leading-tight text-cream sm:text-4xl">
                      {section.title}
                    </h2>
                    {section.body.map((paragraph, index) => (
                      <p
                        key={index}
                        className="mt-5 text-base leading-relaxed text-cream-dim"
                      >
                        {paragraph}
                      </p>
                    ))}
                    {section.eyebrow === "Growing Hotel Network" &&
                      hotelCount > 0 && (
                        <div className="mt-8 flex flex-wrap gap-4">
                          <div className="border border-ink-line bg-ink-soft px-6 py-4">
                            <div className="font-display text-3xl text-gold">
                              {hotelCount}
                            </div>
                            <div className="mt-1 text-[11px] tracking-[0.25em] uppercase text-cream-muted">
                              {hotelCount === 1 ? "Property" : "Properties"} live
                            </div>
                          </div>
                          <div className="flex items-center border border-ink-line bg-ink-soft px-6 py-4 text-sm text-cream-dim">
                            {hotels.map((hotel) => hotel.name).join(" · ")}
                          </div>
                        </div>
                      )}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="mt-24 border-t border-ink-line pt-14 text-center">
            <h2 className="font-display text-3xl text-cream sm:text-4xl">
              Plan your next stay with us
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-cream-dim">
              Explore our hotels and send a booking inquiry — our team will be in
              touch to confirm availability and tailor your stay.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="/#hotels"
                className="inline-flex w-full items-center justify-center bg-gold px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft sm:w-auto"
              >
                Explore Our Hotels
              </a>
              <a
                href="/#contact"
                className="inline-flex w-full items-center justify-center border border-cream/30 px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream transition-colors hover:border-gold hover:text-gold sm:w-auto"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer hotel={null} />
    </>
  );
}
