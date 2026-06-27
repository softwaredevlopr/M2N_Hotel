"use client";

import { useState, useEffect } from "react";
import { Menu, X, Phone } from "lucide-react";
import BrandLogo from "./BrandLogo";
import { formatPhoneDisplay, phoneHref } from "@/lib/format";

const HOTEL_NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Rooms", href: "#rooms" },
  { label: "Amenities", href: "#amenities" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

const BRAND_NAV_LINKS = [
  { label: "Home", href: "/#home" },
  { label: "Our Hotels", href: "/#hotels" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export default function Navbar({ variant = "hotel", hotel, phone }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isBrand = variant === "brand";
  const navLinks = isBrand ? BRAND_NAV_LINKS : HOTEL_NAV_LINKS;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const rawPhone = phone || hotel?.phone || "";
  const phoneNumber = rawPhone ? formatPhoneDisplay(rawPhone) : "";
  const telHref = phoneHref(rawPhone) || "#contact";
  const reserveHref = isBrand ? "/#hotels" : "#contact";
  const reserveLabel = isBrand ? "Explore Hotels" : "Reserve";

  return (
    <header
      className={`sticky top-0 z-50 border-b border-black/[0.08] bg-[#FFFDF8]/95 backdrop-blur-md transition-shadow duration-300 ${
        scrolled
          ? "shadow-[0_8px_24px_-14px_rgba(0,0,0,0.35)]"
          : "shadow-[0_2px_10px_-8px_rgba(0,0,0,0.25)]"
      }`}
    >
      <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between px-6 py-2.5 lg:min-h-[74px] lg:px-10 lg:py-2">
        <a
          href="/"
          className="inline-flex items-center"
          aria-label="M2N Hotels home"
        >
          <BrandLogo variant="navbar" priority />
        </a>

        <nav className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920] after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:w-0 after:bg-[#D71920] after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          {phoneNumber && (
            <a
              href={telHref}
              className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920]"
            >
              <Phone className="h-4 w-4" />
              {phoneNumber}
            </a>
          )}
          <a
            href={reserveHref}
            className="rounded-sm bg-[#D71920] px-6 py-2.5 text-xs font-semibold tracking-[0.16em] uppercase text-white shadow-[0_6px_18px_-8px_rgba(215,25,32,0.55)] transition-all hover:bg-[#B51218]"
          >
            {reserveLabel}
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="lg:hidden text-[#222222] transition-colors hover:text-[#D71920]"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-black/[0.08] bg-[#FFFDF8]">
          <nav className="flex flex-col px-6 py-6 gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-black/10 py-2 text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920]"
              >
                {link.label}
              </a>
            ))}
            {phoneNumber && (
              <a
                href={telHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-1 text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920]"
              >
                <Phone className="h-4 w-4" />
                {phoneNumber}
              </a>
            )}
            <a
              href={reserveHref}
              onClick={() => setOpen(false)}
              className="mt-3 rounded-sm bg-[#D71920] px-5 py-3 text-center text-xs font-semibold tracking-[0.16em] uppercase text-white shadow-[0_6px_18px_-8px_rgba(215,25,32,0.55)] transition-colors hover:bg-[#B51218]"
            >
              {isBrand ? "Explore Our Hotels" : "Reserve a Stay"}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
