"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";

export default function GalleryGrid({ items = [] }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const isOpen = activeIndex !== null;

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrev = useCallback(() => {
    setActiveIndex((i) => (i === null ? i : (i - 1 + items.length) % items.length));
  }, [items.length]);
  const showNext = useCallback(() => {
    setActiveIndex((i) => (i === null ? i : (i + 1) % items.length));
  }, [items.length]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close, showPrev, showNext]);

  if (items.length === 0) {
    return (
      <p className="text-center text-sm tracking-[0.2em] uppercase text-cream-muted">
        Gallery images will appear here once available.
      </p>
    );
  }

  const active = isOpen ? items[activeIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 auto-rows-[180px] sm:gap-5 sm:auto-rows-[240px] md:grid-cols-4 lg:auto-rows-[280px]">
        {items.map((item, index) => {
          const layoutClass = index === 0 ? "md:col-span-2 md:row-span-2" : "";
          const caption = item.caption || item.alt_text || `Image ${index + 1}`;
          const altText = item.alt_text || caption;
          return (
            <button
              key={item.id || `${item.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View ${caption}`}
              className={`group relative overflow-hidden ${layoutClass}`}
            >
              <img
                src={item.url}
                alt={altText}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
              <figcaption className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs tracking-[0.25em] uppercase text-cream">
                <span className="line-clamp-1">{caption}</span>
                <ArrowUpRight
                  className="h-4 w-4 flex-shrink-0 text-gold opacity-0 transition-opacity group-hover:opacity-100"
                  strokeWidth={1.5}
                />
              </figcaption>
            </button>
          );
        })}
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image viewer"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/95 p-4 sm:p-8"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close gallery"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center border border-cream/30 text-cream transition-colors hover:border-gold hover:text-gold sm:right-8 sm:top-8"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showPrev();
                }}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-cream/30 text-cream transition-colors hover:border-gold hover:text-gold sm:left-8"
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showNext();
                }}
                aria-label="Next image"
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-cream/30 text-cream transition-colors hover:border-gold hover:text-gold sm:right-8"
              >
                <ChevronRight className="h-6 w-6" strokeWidth={1.5} />
              </button>
            </>
          )}

          <figure
            className="flex max-h-full max-w-5xl flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.url}
              alt={active.alt_text || active.caption || "Gallery image"}
              className="max-h-[80vh] w-auto max-w-full object-contain"
            />
            <figcaption className="mt-5 flex items-center gap-3 text-xs tracking-[0.25em] uppercase text-cream-muted">
              <span>{active.caption || active.alt_text}</span>
              <span className="text-gold">
                {activeIndex + 1} / {items.length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
