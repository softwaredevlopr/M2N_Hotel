import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HotelCard from "@/components/HotelCard";
import BackendOfflineBanner from "@/components/BackendOfflineBanner";
import { getHotelsWithDetails } from "@/lib/api";
import { BRAND_NAME, BRAND_DESCRIPTION } from "@/lib/brand";

export const revalidate = 60;

export const metadata = {
  title: "Select a Hotel",
  description: `Choose a ${BRAND_NAME} property to begin your booking. ${BRAND_DESCRIPTION}`,
  alternates: { canonical: "/book" },
};

// Step 1 of the booking flow: Select Hotel → (future) Select Room → Guest Details → Payment.
// Selecting a hotel currently continues to that property's inquiry section until the
// room / payment steps are built.
export default async function BookPage() {
  const hotels = await getHotelsWithDetails();
  const isOffline = hotels.length === 0;

  return (
    <>
      {isOffline && <BackendOfflineBanner />}
      <Navbar hotels={hotels} />
      <main className="bg-ink">
        <section className="border-b border-ink-line py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
            <span className="text-xs tracking-[0.45em] uppercase text-gold">
              Book Your Stay
            </span>
            <div className="gold-divider mx-auto mt-5" />
            <h1 className="mt-8 font-display text-4xl leading-tight text-cream sm:text-5xl lg:text-6xl">
              Select a Hotel
            </h1>
            <p className="mt-6 text-base leading-relaxed text-cream-dim sm:text-lg">
              Choose a property from the {BRAND_NAME} collection to continue your
              booking. More hotels will appear here as our network grows.
            </p>
            <ol className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] tracking-[0.2em] uppercase text-cream-muted">
              <li className="text-gold">1. Select Hotel</li>
              <li aria-hidden className="text-gold/40">
                ·
              </li>
              <li>2. Select Room</li>
              <li aria-hidden className="text-gold/40">
                ·
              </li>
              <li>3. Guest Details</li>
              <li aria-hidden className="text-gold/40">
                ·
              </li>
              <li>4. Payment</li>
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-10 sm:py-20">
          {hotels.length === 0 ? (
            <p className="text-center text-sm tracking-[0.2em] uppercase text-cream-muted">
              Hotels will appear here once available.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {hotels.map((hotel) => (
                <HotelCard
                  key={hotel.id || hotel.slug}
                  hotel={hotel}
                  href={`/hotels/${hotel.slug}#contact`}
                  ctaLabel="Select Hotel"
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer hotel={null} />
    </>
  );
}
