import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingLookup from "@/components/booking/BookingLookup";
import { getHotels } from "@/lib/api";

// A reservation is private: it must never be indexed or previewed by crawlers.
export async function generateMetadata({ params }) {
  const { bookingNumber } = await params;
  return {
    title: `Booking ${bookingNumber}`,
    description: "View your reservation details.",
    robots: { index: false, follow: false },
  };
}

export default async function BookingConfirmationPage({ params, searchParams }) {
  const { bookingNumber } = await params;
  const query = (await searchParams) || {};
  const justReceived =
    query.received === "1" || query.received === "true";
  const hotels = await getHotels();

  return (
    <>
      <Navbar hotels={hotels} />
      <main className="bg-ink">
        <section className="mx-auto max-w-4xl px-6 py-16 lg:px-10 sm:py-24">
          <BookingLookup
            bookingNumber={bookingNumber}
            justReceived={justReceived}
          />
        </section>
      </main>
      <Footer hotel={null} />
    </>
  );
}
