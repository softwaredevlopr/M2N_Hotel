import { BRAND_NAME, BRAND_TAGLINE, BRAND_SHORT_DESCRIPTION } from "@/lib/brand";

export default function manifest() {
  return {
    name: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    short_name: BRAND_NAME,
    description: BRAND_SHORT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0B",
    theme_color: "#0B0B0B",
    icons: [
      {
        src: "/m2n-logo.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
