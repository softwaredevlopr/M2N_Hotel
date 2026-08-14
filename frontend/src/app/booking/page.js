import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FindBookingForm from "@/components/booking/FindBookingForm";
import { getHotels } from "@/lib/api";
import { BRAND_NAME, BRAND_DESCRIPTION } from "@/lib/brand";

export const metadata = {
  title: "Find Your Booking",
  description: `Look up a ${BRAND_NAME} reservation with your booking reference and contact details. ${BRAND_DESCRIPTION}`,
  robots: { index: false, follow: false },
  alternates: { canonical: "/booking" },
};

export default async function FindBookingPage() {
  const hotels = await getHotels();

  return (
    <>
      <Navbar hotels={hotels} />
      <main className="bg-ink">
        <section className="mx-auto max-w-xl px-6 py-16 lg:px-10 sm:py-24">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Reservations
          </span>
          <h1 className="mt-6 font-display text-4xl text-cream sm:text-5xl">
            Find your booking
          </h1>
          <div className="gold-divider mt-5" />
          <p className="mt-6 text-sm leading-relaxed text-cream-dim">
            Enter the reference from your confirmation and the email or mobile
            number used when you booked. No payment details are stored online.
          </p>
          <div className="mt-8 border border-ink-line bg-ink-soft p-6 sm:p-8">
            <FindBookingForm />
          </div>
        </section>
      </main>
      <Footer hotel={null} />
    </>
  );
}
