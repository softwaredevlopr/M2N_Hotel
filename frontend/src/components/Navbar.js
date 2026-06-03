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

export default function Navbar({ hotel, phone }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const phoneNumber = phone || hotel?.phone || "";
  const phoneHref = phoneNumber ? `tel:${phoneNumber.replace(/\s+/g, "")}` : "#";

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-[#FFF8F5]/95 backdrop-blur-md transition-shadow duration-300 ${
        scrolled
          ? "border-[#111111]/10 shadow-[0_10px_30px_-14px_rgba(0,0,0,0.45)]"
          : "border-[#111111]/5 shadow-[0_4px_18px_-14px_rgba(0,0,0,0.35)]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-10">
        <a
          href="#home"
          className="inline-flex items-center"
          aria-label="M2N Hotels home"
        >
          <BrandLogo variant="navbar" priority />
        </a>

        <nav className="hidden lg:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative text-sm tracking-[0.18em] uppercase text-[#111111] transition-colors hover:text-gold after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:w-0 after:bg-gold after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          {phoneNumber && (
            <a
              href={phoneHref}
              className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-[#111111]/70 transition-colors hover:text-gold"
            >
              <Phone className="h-4 w-4" />
              {phoneNumber}
            </a>
          )}
          <a
            href="#contact"
            className="rounded-sm bg-gold px-6 py-2.5 text-xs font-medium tracking-[0.25em] uppercase text-cream shadow-[0_8px_22px_-8px_rgba(215,25,32,0.6)] transition-all hover:bg-gold-deep hover:shadow-[0_10px_26px_-8px_rgba(215,25,32,0.75)]"
          >
            Reserve
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="lg:hidden text-[#111111] transition-colors hover:text-gold"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[#111111]/10 bg-[#FFF8F5]">
          <nav className="flex flex-col px-6 py-6 gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-[#111111]/10 py-2 text-sm tracking-[0.2em] uppercase text-[#111111] transition-colors hover:text-gold"
              >
                {link.label}
              </a>
            ))}
            {phoneNumber && (
              <a
                href={phoneHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-1 text-xs tracking-[0.2em] uppercase text-[#111111]/70 transition-colors hover:text-gold"
              >
                <Phone className="h-4 w-4" />
                {phoneNumber}
              </a>
            )}
            <a
              href="#contact"
              onClick={() => setOpen(false)}
              className="mt-3 rounded-sm bg-gold px-5 py-3 text-center text-xs font-medium tracking-[0.25em] uppercase text-cream shadow-[0_8px_22px_-8px_rgba(215,25,32,0.6)] transition-colors hover:bg-gold-deep"
            >
              Reserve a Stay
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
