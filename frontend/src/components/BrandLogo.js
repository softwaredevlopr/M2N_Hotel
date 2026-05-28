"use client";

import Image from "next/image";
import { useState } from "react";

const SIZE_MAP = {
  sm: { box: "h-9 w-9", padding: "p-1", fallback: "h-9 w-9 text-base" },
  md: { box: "h-10 w-10", padding: "p-1.5", fallback: "h-10 w-10 text-lg" },
  lg: { box: "h-12 w-12", padding: "p-2", fallback: "h-12 w-12 text-xl" },
};

export default function BrandLogo({
  size = "md",
  brandText = "M2N HOTELS",
  subText,
  priority = false,
}) {
  const [errored, setErrored] = useState(false);
  const config = SIZE_MAP[size] || SIZE_MAP.md;

  if (errored) {
    return (
      <span className="inline-flex items-center gap-3">
        <span
          className={`flex ${config.fallback} items-center justify-center rounded-full border border-accent/60 text-accent font-display`}
        >
          M
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-display text-lg tracking-[0.25em] text-cream">
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
      className={`inline-flex items-center justify-center bg-white rounded-md ${config.padding} ring-1 ring-accent/40 shadow-[0_2px_12px_rgba(0,0,0,0.25)]`}
    >
      <Image
        src="/m2n-logo.png"
        alt="M2N Hotels"
        width={160}
        height={160}
        priority={priority}
        onError={() => setErrored(true)}
        className={`${config.box} object-contain`}
      />
    </span>
  );
}
