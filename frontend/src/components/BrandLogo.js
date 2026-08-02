"use client";

import Image from "next/image";
import { useState } from "react";

const NAV_LOGO = "/m2n-logo-tagline.png";
const NAV_LOGO_W = 649;
const NAV_LOGO_H = 373;

const MARK_SRC = "/m2n-logo.png";
const MARK_W = 812;
const MARK_H = 508;

export default function BrandLogo({ variant = "navbar", priority = false }) {
  const [errored, setErrored] = useState(false);

  if (variant === "footer") {
    if (errored) {
      return (
        <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-gold font-display text-sm tracking-tight text-cream shadow-[0_6px_18px_-6px_rgba(215,25,32,0.7)]">
          M2N
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2.5 backdrop-blur-sm shadow-[0_6px_18px_-8px_rgba(0,0,0,0.65)]">
        <Image
          src={MARK_SRC}
          alt="M2N Hotels"
          width={MARK_W}
          height={MARK_H}
          onError={() => setErrored(true)}
          className="h-16 w-auto rounded-[4px] object-contain"
        />
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
    <span className="inline-flex h-[46px] w-[148px] shrink-0 items-center justify-center lg:h-[58px] lg:w-[150px]">
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
