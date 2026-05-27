import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Amenities from "@/components/Amenities";
import FeaturedRooms from "@/components/FeaturedRooms";
import Gallery from "@/components/Gallery";
import ContactCTA from "@/components/ContactCTA";
import Footer from "@/components/Footer";
import BackendOfflineBanner from "@/components/BackendOfflineBanner";
import { getHotelBySlug, getRoomTypes } from "@/lib/api";

const PRIMARY_HOTEL_SLUG = process.env.NEXT_PUBLIC_HOTEL_SLUG || "m2n-hotel-jaipur";

export const revalidate = 60;

export default async function Home() {
  const [hotel, roomTypes] = await Promise.all([
    getHotelBySlug(PRIMARY_HOTEL_SLUG),
    getRoomTypes(PRIMARY_HOTEL_SLUG),
  ]);

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
