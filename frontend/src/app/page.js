import Navbar from "@/components/Navbar";
import BrandHero from "@/components/BrandHero";
import OurHotels from "@/components/OurHotels";
import BrandAbout from "@/components/BrandAbout";
import WhyChooseM2N from "@/components/WhyChooseM2N";
import ContactCTA from "@/components/ContactCTA";
import Footer from "@/components/Footer";
import BackendOfflineBanner from "@/components/BackendOfflineBanner";
import JsonLd from "@/components/JsonLd";
import { getHotelsWithDetails } from "@/lib/api";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION } from "@/lib/brand";
import { resolveBrandHeroImage } from "@/lib/images";
import { organizationLd } from "@/lib/structuredData";

export const revalidate = 60;

export const metadata = {
  title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  description: BRAND_DESCRIPTION,
};

export default async function Home() {
  const hotels = await getHotelsWithDetails();
  const isOffline = hotels.length === 0;
  // Brand hero only — never a hotel photo (those stay on /hotels/[slug]).
  const brandHeroImage = resolveBrandHeroImage();

  return (
    <>
      <JsonLd data={organizationLd()} />
      {isOffline && <BackendOfflineBanner />}
      <Navbar hotels={hotels} />
      <main>
        <BrandHero heroImage={brandHeroImage} />
        <BrandAbout />
        <OurHotels hotels={hotels} />
        <WhyChooseM2N />
        <ContactCTA hotel={null} />
      </main>
      <Footer hotel={null} />
    </>
  );
}
