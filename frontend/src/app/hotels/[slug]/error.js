"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function HotelError({ error, reset }) {
  useEffect(() => {
    console.error("[hotel-page]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <span className="text-xs tracking-[0.45em] uppercase text-gold">
          Something went wrong
        </span>
        <div className="gold-divider mx-auto mt-5" />
        <h1 className="mt-8 font-display text-4xl leading-tight text-cream">
          We couldn&apos;t load this hotel
        </h1>
        <p className="mt-6 text-base leading-relaxed text-cream-dim">
          The property page is temporarily unavailable. Please try again, or
          return to the homepage to explore our hotels.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center bg-gold px-8 py-4 text-xs tracking-[0.25em] uppercase text-cream hover:bg-gold-soft transition-colors w-full sm:w-auto"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center border border-cream/30 px-8 py-4 text-xs tracking-[0.25em] uppercase text-cream hover:border-gold hover:text-gold transition-colors w-full sm:w-auto"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
