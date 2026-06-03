"use client";

import Image from "next/image";
import { useState } from "react";

const MARK_SRC = "/m2n-mark.png";
const MARK_W = 187;
const MARK_H = 212;
const BRAND = "M2N HOTELS";

const VARIANTS = {
  navbar: {
    tile: "p-1.5",
    mark: "h-8",
    wordmark: "text-base sm:text-[1.05rem]",
    showSub: true,
  },
  footer: {
    tile: "p-2",
    mark: "h-10",
    wordmark: "text-lg",
    showSub: false,
  },
};

export default function BrandLogo({ variant = "navbar", subText, priority = false }) {
  const [errored, setErrored] = useState(false);
  const config = VARIANTS[variant] || VARIANTS.navbar;

  return (
    <span className="inline-flex items-center gap-3">
      {errored ? (
        <span
          className={`flex ${
            variant === "footer" ? "h-11 w-11" : "h-9 w-9"
          } items-center justify-center rounded-lg bg-gold font-display text-xs tracking-tight text-cream shadow-[0_6px_18px_-6px_rgba(215,25,32,0.7)]`}
        >
          M2N
        </span>
      ) : (
        <span
          className={`inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 ${config.tile} backdrop-blur-sm shadow-[0_6px_18px_-8px_rgba(0,0,0,0.65)]`}
        >
          <Image
            src={MARK_SRC}
            alt="M2N Hotels"
            width={MARK_W}
            height={MARK_H}
            priority={priority}
            onError={() => setErrored(true)}
            className={`${config.mark} w-auto rounded-[4px] object-contain`}
          />
        </span>
      )}

      <span className="flex flex-col leading-tight">
        <span
          className={`font-display ${config.wordmark} tracking-[0.22em] text-cream`}
        >
          {BRAND}
        </span>
        {config.showSub && subText && (
          <span className="text-[9px] tracking-[0.4em] text-cream-muted">
            {subText}
          </span>
        )}
      </span>
    </span>
  );
}
