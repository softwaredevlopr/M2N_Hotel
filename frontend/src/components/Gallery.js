import { getGalleryItems } from "@/lib/images";
import GalleryGrid from "@/components/GalleryGrid";

import { BRAND_NAME } from "@/lib/brand";

export default function Gallery({ hotel }) {
  const items = getGalleryItems(hotel);
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
          {items.length > 0 && (
            <p className="max-w-xs text-sm leading-relaxed text-cream-dim lg:pb-2 lg:text-right">
              Tap any photograph to explore the space in full.
            </p>
          )}
        </div>

        <GalleryGrid items={items} />
      </div>
    </section>
  );
}
