import { Camera, ArrowUpRight } from "lucide-react";
import { resolveMediaUrl } from "@/lib/images";

import { BRAND_NAME } from "@/lib/brand";

const GALLERY_LAYOUT = [
  "md:col-span-2 md:row-span-2",
  "",
  "",
  "",
  "hidden md:block",
];

function pickGalleryItems(media) {
  if (!Array.isArray(media) || media.length === 0) {
    return [];
  }
  const sorted = [...media].sort((a, b) => {
    if (a.is_cover && !b.is_cover) return -1;
    if (!a.is_cover && b.is_cover) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });
  return sorted.slice(0, GALLERY_LAYOUT.length);
}

export default function Gallery({ hotel, media = [] }) {
  const items = pickGalleryItems(media);
  const galleryTitle = hotel?.name || BRAND_NAME;

  return (
    <section
      id="gallery"
      className="relative bg-ink-soft py-28 sm:py-36 border-t border-ink-line"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16">
          <div>
            <span className="text-xs tracking-[0.45em] uppercase text-gold">
              Gallery
            </span>
            <div className="gold-divider mt-5" />
            <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
              A look inside
              <br />
              <span className="italic text-gold">{galleryTitle}.</span>
            </h2>
          </div>
          <a
            href="#contact"
            className="inline-flex items-center gap-3 text-xs tracking-[0.25em] uppercase text-gold hover:text-gold-soft transition-colors"
          >
            <Camera className="h-4 w-4" strokeWidth={1.5} />
            View Full Gallery
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
          </a>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-sm tracking-[0.2em] uppercase text-cream-muted">
            Gallery images will appear here once available.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-3 sm:gap-4 auto-rows-[200px] sm:auto-rows-[240px]">
            {items.map((item, index) => {
              const layoutClass = GALLERY_LAYOUT[index] || "";
              const imageUrl = resolveMediaUrl(item, index);
              const caption =
                item.caption || item.alt_text || `Image ${index + 1}`;
              const altText = item.alt_text || caption;
              return (
                <figure
                  key={item.id || `${imageUrl}-${index}`}
                  className={`group relative overflow-hidden ${layoutClass}`}
                >
                  <img
                    src={imageUrl}
                    alt={altText}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
                  <figcaption className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs tracking-[0.25em] uppercase text-cream">
                    <span className="line-clamp-1">{caption}</span>
                    <ArrowUpRight
                      className="h-4 w-4 text-gold opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      strokeWidth={1.5}
                    />
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
