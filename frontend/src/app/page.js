import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Amenities from "@/components/Amenities";
import FeaturedRooms from "@/components/FeaturedRooms";
import Gallery from "@/components/Gallery";
import ContactCTA from "@/components/ContactCTA";
import Footer from "@/components/Footer";
import BackendOfflineBanner from "@/components/BackendOfflineBanner";
import OurHotels from "@/components/OurHotels";
import { getHotelBySlug, getHotelsWithDetails, getRoomTypes } from "@/lib/api";
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_DESCRIPTION,
} from "@/lib/brand";

export const revalidate = 60;

function resolvePrimaryHotelSlug() {
  const envSlug = process.env.NEXT_PUBLIC_HOTEL_SLUG;
  if (typeof envSlug === "string" && envSlug.trim().length > 0) {
    return envSlug.trim();
  }
  return null;
}

export async function generateMetadata() {
  const slug = resolvePrimaryHotelSlug();
  const hotel = slug ? await getHotelBySlug(slug) : null;

  const title = hotel?.name
    ? `${hotel.name} | ${BRAND_NAME}`
    : `${BRAND_NAME} — ${BRAND_TAGLINE}`;
  const description = hotel?.description || BRAND_DESCRIPTION;

  return {
    title,
    description,
  };
}

export default async function Home() {
  const slug = resolvePrimaryHotelSlug();

  const [hotel, roomTypes, allHotels] = await Promise.all([
    slug ? getHotelBySlug(slug) : Promise.resolve(null),
    slug ? getRoomTypes(slug) : Promise.resolve([]),
    getHotelsWithDetails(),
  ]);

  const isOffline = hotel === null;
  const amenities = hotel?.amenities ?? [];
  const media = hotel?.media ?? [];
  const currencyCode = hotel?.currency_code || "INR";

  return (
    <>
      {isOffline && <BackendOfflineBanner />}
      <Navbar variant="hotel" hotel={hotel} />
      <main>
        <Hero hotel={hotel} />
        <About hotel={hotel} roomTypes={roomTypes} />
        <Amenities hotel={hotel} amenities={amenities} />
        <FeaturedRooms
          hotel={hotel}
          roomTypes={roomTypes}
          currencyCode={currencyCode}
        />
        <Gallery hotel={hotel} media={media} />
        <ContactCTA hotel={hotel} />
        <OurHotels hotels={allHotels} />
      </main>
      <Footer hotel={hotel} />
    </>
  );
}
