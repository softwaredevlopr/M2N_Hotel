import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Amenities from "@/components/Amenities";
import FeaturedRooms from "@/components/FeaturedRooms";
import Gallery from "@/components/Gallery";
import ContactCTA from "@/components/ContactCTA";
import Footer from "@/components/Footer";
import BackendOfflineBanner from "@/components/BackendOfflineBanner";
import { getHotels, getHotelBySlug, getRoomTypes } from "@/lib/api";

export const revalidate = 60;

async function resolvePrimaryHotelSlug() {
  const envSlug = process.env.NEXT_PUBLIC_HOTEL_SLUG;
  if (typeof envSlug === "string" && envSlug.trim().length > 0) {
    return envSlug.trim();
  }

  const hotels = await getHotels();
  return hotels[0]?.slug ?? null;
}

export default async function Home() {
  const slug = await resolvePrimaryHotelSlug();

  const [hotel, roomTypes] = slug
    ? await Promise.all([getHotelBySlug(slug), getRoomTypes(slug)])
    : [null, []];

  const isOffline = hotel === null && roomTypes.length === 0;
  const amenities = hotel?.amenities ?? [];
  const media = hotel?.media ?? [];
  const currencyCode = hotel?.currency_code || "INR";

  return (
    <>
      {isOffline && <BackendOfflineBanner />}
      <Navbar hotel={hotel} />
      <main>
        <Hero hotel={hotel} />
        <About hotel={hotel} roomTypes={roomTypes} />
        <Amenities amenities={amenities} />
        <FeaturedRooms roomTypes={roomTypes} currencyCode={currencyCode} />
        <Gallery media={media} />
        <ContactCTA hotel={hotel} />
      </main>
      <Footer hotel={hotel} />
    </>
  );
}
