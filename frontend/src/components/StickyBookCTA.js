"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";

/**
 * Floating "Book Now" button for hotel detail pages. Appears after the guest
 * scrolls past the hero. Links into the booking flow with the hotel preselected;
 * the inquiry form at #contact remains available on the page.
 */
export default function StickyBookCTA({ href = "/book" }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 600);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Link
      href={href}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-5 left-1/2 z-50 inline-flex -translate-x-1/2 items-center justify-center gap-2.5 bg-gold px-8 py-4 text-xs tracking-[0.25em] uppercase text-cream shadow-lg shadow-ink/40 transition-all duration-300 hover:bg-gold-soft sm:left-auto sm:right-8 sm:translate-x-0 ${
        visible
          ? "pointer-events-auto opacity-100 translate-y-0"
          : "pointer-events-none opacity-0 translate-y-4"
      }`}
    >
      <Calendar className="h-4 w-4" strokeWidth={1.5} />
      Book Now
    </Link>
  );
}
