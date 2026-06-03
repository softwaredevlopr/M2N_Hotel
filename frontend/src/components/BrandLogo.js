"use client";

import Image from "next/image";
import { useState } from "react";

const NAV_LOGO = "/m2n-logo-tagline.png";
const NAV_LOGO_W = 649;
const NAV_LOGO_H = 373;

const MARK_SRC = "/m2n-mark.png";
const MARK_W = 187;
const MARK_H = 212;

export default function BrandLogo({ variant = "navbar", priority = false }) {
  const [errored, setErrored] = useState(false);

  if (variant === "footer") {
    return (
      <span className="inline-flex items-center gap-3">
        {errored ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold font-display text-xs tracking-tight text-cream shadow-[0_6px_18px_-6px_rgba(215,25,32,0.7)]">
            M2N
          </span>
        ) : (
          <span className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 backdrop-blur-sm shadow-[0_6px_18px_-8px_rgba(0,0,0,0.65)]">
            <Image
              src={MARK_SRC}
              alt="M2N Hotels"
              width={MARK_W}
              height={MARK_H}
              onError={() => setErrored(true)}
              className="h-10 w-auto rounded-[4px] object-contain"
            />
          </span>
        )}
        <span className="font-display text-lg tracking-[0.22em] text-cream">
          M2N HOTELS
        </span>
      </span>
    );
  }

  if (errored) {
    return (
      <span className="font-display text-xl tracking-[0.18em] text-[#111111]">
        M2N Hotels
      </span>
    );
  }

  return (
    <span className="inline-flex h-[46px] w-[136px] shrink-0 items-center justify-center lg:h-[58px] lg:w-[148px]">
      <Image
        src={NAV_LOGO}
        alt="M2N Hotels"
        width={NAV_LOGO_W}
        height={NAV_LOGO_H}
        priority={priority}
        onError={() => setErrored(true)}
        className="max-h-full max-w-full object-contain"
      />
    </span>
  );
}
