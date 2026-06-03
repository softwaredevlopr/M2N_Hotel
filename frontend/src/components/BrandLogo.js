"use client";

import Image from "next/image";
import { useState } from "react";

const LOGO_SRC = "/m2n-logo.png";
const LOGO_ALT = "M2N Hotels";

const VARIANTS = {
  navbar: {
    width: 118,
    height: 42,
    fallbackBox: "h-9 w-9 text-base",
    fallbackText: "text-base",
  },
  footer: {
    width: 152,
    height: 54,
    fallbackBox: "h-11 w-11 text-lg",
    fallbackText: "text-lg",
  },
};

export default function BrandLogo({
  variant = "navbar",
  brandText = "M2N HOTELS",
  subText,
  priority = false,
}) {
  const [errored, setErrored] = useState(false);
  const config = VARIANTS[variant] || VARIANTS.navbar;

  if (errored) {
    return (
      <span className="inline-flex items-center gap-3">
        <span
          className={`flex ${config.fallbackBox} items-center justify-center rounded-full border border-accent/60 text-accent font-display`}
        >
          M
        </span>
        <span className="flex flex-col leading-tight">
          <span
            className={`font-display ${config.fallbackText} tracking-[0.25em] text-cream`}
          >
            {brandText}
          </span>
          {subText && (
            <span className="text-[10px] tracking-[0.4em] text-cream-muted">
              {subText}
            </span>
          )}
        </span>
      </span>
    );
  }

  return (
    <span
      className="relative inline-flex overflow-hidden rounded-lg bg-gradient-to-b from-white to-cream-dim ring-1 ring-accent/25 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.6)]"
      style={{ width: config.width, height: config.height }}
    >
      <Image
        src={LOGO_SRC}
        alt={LOGO_ALT}
        fill
        sizes="160px"
        priority={priority}
        onError={() => setErrored(true)}
        className="object-cover"
        style={{ objectPosition: "center 46%", transform: "scale(1.08)" }}
      />
    </span>
  );
}
