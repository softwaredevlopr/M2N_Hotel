import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getHotels } from "@/lib/api";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export const revalidate = 60;

export const metadata = {
  title: `Login | ${BRAND_NAME}`,
  description: `Sign in to manage your ${BRAND_NAME} bookings.`,
};

export default async function LoginPage() {
  const hotels = await getHotels();

  return (
    <>
      <Navbar hotels={hotels} />
      <main className="flex min-h-[70vh] items-center justify-center bg-ink px-6 py-28">
        <div className="w-full max-w-md text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Guest Login
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h1 className="mt-8 font-display text-4xl sm:text-5xl leading-tight text-cream">
            Welcome to
            <br />
            <span className="italic text-gold">{BRAND_NAME}.</span>
          </h1>
          <p className="mt-6 text-base leading-relaxed text-cream-dim">
            {BRAND_TAGLINE}. Guest accounts are coming soon. In the meantime,
            explore our hotels and reserve your stay directly.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/#hotels"
              className="inline-flex w-full sm:w-auto items-center justify-center bg-gold px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream hover:bg-gold-soft transition-colors"
            >
              Explore Hotels
            </Link>
            <Link
              href="/"
              className="inline-flex w-full sm:w-auto items-center justify-center border border-cream/30 px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream hover:border-gold hover:text-gold transition-colors"
            >
              Back Home
            </Link>
          </div>
        </div>
      </main>
      <Footer hotel={null} />
    </>
  );
}
