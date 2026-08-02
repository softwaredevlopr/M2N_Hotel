import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Gallery from "@/components/Gallery";
import FeaturedRooms from "@/components/FeaturedRooms";
import Amenities from "@/components/Amenities";
import RoomTariff from "@/components/RoomTariff";
import HotelLocation from "@/components/HotelLocation";
import GuestReviews from "@/components/GuestReviews";
import ContactCTA from "@/components/ContactCTA";
import StickyBookCTA from "@/components/StickyBookCTA";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { getHotelPageData, getHotelBySlug } from "@/lib/api";
import { BRAND_NAME, BRAND_DESCRIPTION } from "@/lib/brand";
import { resolveHeroImage } from "@/lib/images";
import { formatLocation } from "@/lib/format";
import { hotelLd } from "@/lib/structuredData";

export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const hotel = await getHotelBySlug(slug);

  if (!hotel) {
    return {
      title: BRAND_NAME,
      description: BRAND_DESCRIPTION,
    };
  }

  const location = formatLocation(hotel);
  const description =
    hotel.description ||
    `${hotel.name}${location ? ` in ${location}` : ""}. ${BRAND_DESCRIPTION}`;
  const canonical = `/hotels/${hotel.slug}`;
  const ogImage = resolveHeroImage(hotel);

  return {
    title: hotel.name,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: `${hotel.name} | ${BRAND_NAME}`,
      description,
      url: canonical,
      images: ogImage ? [{ url: ogImage, alt: hotel.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${hotel.name} | ${BRAND_NAME}`,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function HotelDetailPage({ params }) {
  const { slug } = await params;

  let hotel;
  let roomTypes;
  let hotels;
  let tariff;

  try {
    ({ hotel, roomTypes, hotels, tariff } = await getHotelPageData(slug));
  } catch (error) {
    if (error?.message?.startsWith("Hotel not found:")) {
      notFound();
    }
    throw error;
  }

  const currencyCode = hotel.currency_code || "INR";
  const heroImage = resolveHeroImage(hotel);
  // Reviews API not yet available — empty list shows a premium empty state.
  const reviews = hotel.reviews ?? [];

  return (
    <>
      <JsonLd data={hotelLd(hotel, { image: heroImage })} />
      <Navbar hotels={hotels} currentSlug={hotel.slug} />
      <main>
        <Hero hotel={hotel} />
        <About hotel={hotel} roomTypes={roomTypes} />
        <FeaturedRooms
          hotel={hotel}
          roomTypes={roomTypes}
          currencyCode={currencyCode}
        />
        <RoomTariff hotel={hotel} tariff={tariff} />
        <Amenities hotel={hotel} />
        <Gallery hotel={hotel} />
        <HotelLocation hotel={hotel} />
        <GuestReviews hotel={hotel} reviews={reviews} />
        <ContactCTA hotel={hotel} roomTypes={roomTypes} />
      </main>
      <StickyBookCTA targetId="contact" />
      <Footer hotel={hotel} />
    </>
  );
}
