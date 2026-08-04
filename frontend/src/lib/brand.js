export const BRAND_NAME = "M2N Hotels";
// Registered company name behind the M2N Hotels brand.
export const BRAND_LEGAL_NAME = "Morning to Night Hotels Pvt Ltd";
export const BRAND_TAGLINE = "Stay Better, Grow Together";

// Brand-level contact details, used as a professional fallback where no
// hotel-specific contact is available (e.g. the homepage footer).
export const BRAND_EMAIL = "reservations@m2nhotel.in";
export const BRAND_PHONE = "+91 XXXX XXXXX";
export const BRAND_LOCATION = `Head Office:
2nd Floor,
D-2023,
Near Kalevam Sweets,
In front of Kamdhenu Sweets,
D Block,
Indira Nagar,
Lucknow,
Uttar Pradesh,
India – 226016`;
export const BRAND_DESCRIPTION =
  "M2N Hotels offers thoughtfully designed stays, warm hospitality, and modern comfort across a growing collection of properties — ideal for families, business travellers, and short city breaks.";

// Short, one-line description for meta tags and cards where space is limited.
export const BRAND_SHORT_DESCRIPTION =
  "Thoughtfully designed stays, warm hospitality, and modern comfort across every M2N Hotels property.";

// Homepage brand hero only. Hotel photography belongs on /hotels/[slug].
export const BRAND_HERO_IMAGE = "/brand-hero.jpg";

// Canonical public site URL. Override per environment via NEXT_PUBLIC_SITE_URL.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://m2n-hotel.vercel.app"
).replace(/\/$/, "");
