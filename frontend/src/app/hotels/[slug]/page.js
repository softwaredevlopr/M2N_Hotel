import { notFound } from "next/navigation";
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
import { BRAND_NAME, BRAND_DESCRIPTION } from "@/lib/brand";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const hotel = await getHotelBySlug(slug);

  if (!hotel) {
    return {
      title: `${BRAND_NAME}`,
      description: BRAND_DESCRIPTION,
    };
  }

  return {
    title: `${hotel.name} | ${BRAND_NAME}`,
    description: hotel.description || BRAND_DESCRIPTION,
  };
}

export default async function HotelDetailPage({ params }) {
  const { slug } = await params;

  const [hotel, roomTypes] = await Promise.all([
    getHotelBySlug(slug),
    getRoomTypes(slug),
  ]);

  if (!hotel) {
    notFound();
  }

  const amenities = hotel.amenities ?? [];
  const media = hotel.media ?? [];
  const currencyCode = hotel.currency_code || "INR";

  return (
    <>
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
      </main>
      <Footer hotel={hotel} />
    </>
  );
}
