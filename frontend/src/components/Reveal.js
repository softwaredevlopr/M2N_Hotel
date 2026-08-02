"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lightweight scroll-reveal wrapper. Fades/slides its children into view the
 * first time they enter the viewport. Respects prefers-reduced-motion and
 * degrades to visible when IntersectionObserver is unavailable.
 */
export default function Reveal({
  children,
  className = "",
  as: Tag = "div",
  delay = 0,
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    if (prefersReduced) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`transition-all duration-700 ease-out will-change-transform ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
