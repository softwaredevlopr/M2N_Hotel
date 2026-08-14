"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import BrandLogo from "./BrandLogo";
import { formatLocation } from "@/lib/format";

const HOME_LINK = { label: "Home", href: "/#home" };
const ABOUT_LINK = { label: "About M2N", href: "/about" };
const CONTACT_LINK = { label: "Contact", href: "/#contact" };

const linkClass =
  "relative text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920] after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:w-0 after:bg-[#D71920] after:transition-all after:duration-300 hover:after:w-full";

export default function Navbar({ hotels = [], currentSlug = "" }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hotelsOpen, setHotelsOpen] = useState(false);
  const [mobileHotelsOpen, setMobileHotelsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setHotelsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasHotels = Array.isArray(hotels) && hotels.length > 0;
  const bookHref = currentSlug
    ? `/book?hotel=${encodeURIComponent(currentSlug)}`
    : "/book";

  return (
    <header
      className={`print:hidden sticky top-0 z-50 border-b border-black/[0.08] bg-[#FFFDF8]/95 backdrop-blur-md transition-shadow duration-300 ${
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
          <a href={HOME_LINK.href} className={linkClass}>
            {HOME_LINK.label}
          </a>

          <a href={ABOUT_LINK.href} className={linkClass}>
            {ABOUT_LINK.label}
          </a>

          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={() => setHotelsOpen(true)}
            onMouseLeave={() => setHotelsOpen(false)}
          >
            <button
              type="button"
              onClick={() => setHotelsOpen((value) => !value)}
              aria-expanded={hotelsOpen}
              aria-haspopup="true"
              className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920]"
            >
              Hotels
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  hotelsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {hotelsOpen && (
              <div className="absolute left-1/2 top-full -translate-x-1/2 pt-4">
                <div className="min-w-[260px] overflow-hidden rounded-sm border border-black/10 bg-white shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)]">
                  {hasHotels ? (
                    <ul className="py-2">
                      {hotels.map((hotel) => {
                        const location = formatLocation(hotel);
                        return (
                          <li key={hotel.id || hotel.slug}>
                            <a
                              href={`/hotels/${hotel.slug}`}
                              onClick={() => setHotelsOpen(false)}
                              className="flex flex-col gap-0.5 px-5 py-3 transition-colors hover:bg-[#F8F5F0]"
                            >
                              <span className="text-sm font-semibold text-[#222222]">
                                {hotel.name}
                              </span>
                              {location && (
                                <span className="text-[11px] tracking-[0.12em] uppercase text-[#8a8a8a]">
                                  {location}
                                </span>
                              )}
                            </a>
                          </li>
                        );
                      })}
                      <li className="border-t border-black/5 mt-1">
                        <a
                          href="/#hotels"
                          onClick={() => setHotelsOpen(false)}
                          className="block px-5 py-3 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#D71920] hover:bg-[#F8F5F0]"
                        >
                          View all hotels
                        </a>
                      </li>
                    </ul>
                  ) : (
                    <p className="px-5 py-4 text-xs tracking-[0.12em] uppercase text-[#8a8a8a]">
                      Hotels coming soon
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <a href={CONTACT_LINK.href} className={linkClass}>
            {CONTACT_LINK.label}
          </a>
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          <a
            href="/booking"
            className="text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920]"
          >
            Find booking
          </a>
          <a
            href="/login"
            className="text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920]"
          >
            Staff login
          </a>
          <a
            href={bookHref}
            className="rounded-sm bg-[#D71920] px-6 py-2.5 text-xs font-semibold tracking-[0.16em] uppercase text-white shadow-[0_6px_18px_-8px_rgba(215,25,32,0.55)] transition-all hover:bg-[#B51218]"
          >
            Book Now
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
          <nav className="flex flex-col px-6 py-6 gap-1">
            <a
              href={HOME_LINK.href}
              onClick={() => setOpen(false)}
              className="border-b border-black/10 py-3 text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920]"
            >
              {HOME_LINK.label}
            </a>

            <a
              href={ABOUT_LINK.href}
              onClick={() => setOpen(false)}
              className="border-b border-black/10 py-3 text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920]"
            >
              {ABOUT_LINK.label}
            </a>

            <div className="border-b border-black/10">
              <button
                type="button"
                onClick={() => setMobileHotelsOpen((value) => !value)}
                aria-expanded={mobileHotelsOpen}
                className="flex w-full items-center justify-between py-3 text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920]"
              >
                Hotels
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    mobileHotelsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {mobileHotelsOpen && (
                <div className="pb-3">
                  {hasHotels ? (
                    hotels.map((hotel) => (
                      <a
                        key={hotel.id || hotel.slug}
                        href={`/hotels/${hotel.slug}`}
                        onClick={() => setOpen(false)}
                        className="block py-2 pl-4 text-xs font-medium tracking-[0.08em] text-[#444444] transition-colors hover:text-[#D71920]"
                      >
                        {hotel.name}
                      </a>
                    ))
                  ) : (
                    <p className="py-2 pl-4 text-xs text-[#8a8a8a]">
                      Hotels coming soon
                    </p>
                  )}
                  <a
                    href="/#hotels"
                    onClick={() => setOpen(false)}
                    className="block py-2 pl-4 text-[11px] font-semibold tracking-[0.18em] uppercase text-[#D71920]"
                  >
                    View all hotels
                  </a>
                </div>
              )}
            </div>

            <a
              href={CONTACT_LINK.href}
              onClick={() => setOpen(false)}
              className="border-b border-black/10 py-3 text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920]"
            >
              {CONTACT_LINK.label}
            </a>

            <a
              href="/booking"
              onClick={() => setOpen(false)}
              className="border-b border-black/10 py-3 text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920]"
            >
              Find booking
            </a>

            <a
              href="/login"
              onClick={() => setOpen(false)}
              className="border-b border-black/10 py-3 text-xs font-semibold tracking-[0.12em] uppercase text-[#222222] transition-colors hover:text-[#D71920]"
            >
              Staff login
            </a>

            <a
              href={bookHref}
              onClick={() => setOpen(false)}
              className="mt-4 rounded-sm bg-[#D71920] px-5 py-3 text-center text-xs font-semibold tracking-[0.16em] uppercase text-white shadow-[0_6px_18px_-8px_rgba(215,25,32,0.55)] transition-colors hover:bg-[#B51218]"
            >
              Book Now
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
