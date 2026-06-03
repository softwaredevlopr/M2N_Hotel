"use client";

import { useState, useEffect } from "react";
import { Menu, X, Phone } from "lucide-react";
import BrandLogo from "./BrandLogo";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Rooms", href: "#rooms" },
  { label: "Amenities", href: "#amenities" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

function deriveBrandTitle(hotelName) {
  if (!hotelName || typeof hotelName !== "string") return "M2N HOTELS";
  return hotelName.trim().toUpperCase();
}

function deriveCityLabel(hotel) {
  const city = hotel?.city?.toUpperCase?.();
  return city ? `${city} · EST 2018` : "BOUTIQUE LUXURY · EST 2018";
}

export default function Navbar({ hotel, phone }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const brand = deriveBrandTitle(hotel?.name);
  const city = deriveCityLabel(hotel);
  const phoneNumber = phone || hotel?.phone || "";
  const phoneHref = phoneNumber ? `tel:${phoneNumber.replace(/\s+/g, "")}` : "#";

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "bg-ink/90 backdrop-blur-lg border-b border-gold/15"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <a
          href="#home"
          className="inline-flex items-center"
          aria-label="M2N Hotels home"
        >
          <BrandLogo variant="navbar" brandText={brand} subText={city} priority />
        </a>

        <nav className="hidden lg:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm tracking-[0.18em] uppercase text-cream-dim hover:text-gold transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          {phoneNumber && (
            <a
              href={phoneHref}
              className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-cream-dim hover:text-gold transition-colors"
            >
              <Phone className="h-4 w-4" />
              {phoneNumber}
            </a>
          )}
          <a
            href="#contact"
            className="border border-gold/60 px-5 py-2.5 text-xs tracking-[0.25em] uppercase text-gold hover:bg-gold hover:text-cream hover:shadow-[0_6px_18px_-6px_rgba(215,25,32,0.6)] transition-all"
          >
            Reserve
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="lg:hidden text-cream hover:text-gold transition-colors"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-ink/95 backdrop-blur-lg border-t border-gold/15">
          <nav className="flex flex-col px-6 py-6 gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm tracking-[0.2em] uppercase text-cream-dim hover:text-gold transition-colors py-2 border-b border-ink-line"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="mt-3 text-center border border-gold/60 px-5 py-3 text-xs tracking-[0.25em] uppercase text-gold hover:bg-gold hover:text-cream transition-colors"
            >
              Reserve a Stay
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
