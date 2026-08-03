import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackendOfflineBanner from "@/components/BackendOfflineBanner";
import BookingFlow from "@/components/booking/BookingFlow";
import { getBookingPageData } from "@/lib/api";
import { resolveCardImage, resolveRoomTypeImage } from "@/lib/images";
import { BRAND_NAME, BRAND_DESCRIPTION } from "@/lib/brand";

export const metadata = {
  title: "Book Your Stay",
  description: `Reserve a room at a ${BRAND_NAME} property. ${BRAND_DESCRIPTION}`,
  alternates: { canonical: "/book" },
};

function firstParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return typeof value === "string" ? value : "";
}

// Guest booking flow: Select Hotel → Room & Dates → Guest Details.
// A property page can deep-link into the flow with ?hotel=<slug>&room=<slug>.
export default async function BookPage({ searchParams }) {
  const params = (await searchParams) || {};
  const { hotels, roomTypesByHotel, roomsByHotel, tariffsByHotel } =
    await getBookingPageData();
  const isOffline = hotels.length === 0;

  const requestedHotel = firstParam(params.hotel);
  const initialHotelSlug = hotels.some((hotel) => hotel.slug === requestedHotel)
    ? requestedHotel
    : "";

  const requestedRoom = firstParam(params.room);
  const initialRoomTypeSlug =
    initialHotelSlug &&
    (roomTypesByHotel[initialHotelSlug] || []).some(
      (roomType) => roomType.slug === requestedRoom
    )
      ? requestedRoom
      : "";

  // Image resolution reads the photo folders on disk, so it has to happen here
  // on the server; the interactive steps receive plain URLs.
  const hotelImages = {};
  const roomImagesByHotel = {};
  hotels.forEach((hotel) => {
    hotelImages[hotel.slug] = resolveCardImage(hotel);
    roomImagesByHotel[hotel.slug] = {};
    (roomTypesByHotel[hotel.slug] || []).forEach((roomType, index) => {
      roomImagesByHotel[hotel.slug][roomType.slug] = resolveRoomTypeImage(
        roomType,
        index,
        hotel
      );
    });
  });

  return (
    <>
      {isOffline && <BackendOfflineBanner />}
      <Navbar hotels={hotels} />
      <main className="bg-ink">
        <section className="border-b border-ink-line py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-6 text-center lg:px-10">
            <span className="text-xs tracking-[0.45em] uppercase text-gold">
              Book Your Stay
            </span>
            <div className="gold-divider mx-auto mt-5" />
            <h1 className="mt-8 font-display text-4xl leading-tight text-cream sm:text-5xl lg:text-6xl">
              Reserve Your Room
            </h1>
            <p className="mt-6 text-base leading-relaxed text-cream-dim sm:text-lg">
              Choose a property from the {BRAND_NAME} collection, pick your room
              and dates, and share your details. Our team confirms every
              reservation personally — no payment is taken online.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10 sm:py-20">
          {isOffline ? (
            <p className="border border-ink-line bg-ink-soft p-8 text-center text-sm tracking-[0.2em] uppercase text-cream-muted">
              Booking is temporarily unavailable. Please try again shortly.
            </p>
          ) : (
            <BookingFlow
              hotels={hotels}
              roomTypesByHotel={roomTypesByHotel}
              roomsByHotel={roomsByHotel}
              tariffsByHotel={tariffsByHotel}
              hotelImages={hotelImages}
              roomImagesByHotel={roomImagesByHotel}
              initialHotelSlug={initialHotelSlug}
              initialRoomTypeSlug={initialRoomTypeSlug}
            />
          )}
        </section>
      </main>
      <Footer hotel={null} />
    </>
  );
}
