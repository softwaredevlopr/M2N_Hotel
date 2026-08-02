import {
  BRAND_NAME,
  BRAND_SHORT_DESCRIPTION,
  SITE_URL,
} from "@/lib/brand";
import { isPlaceholderPhone } from "@/lib/format";

function absolute(url) {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Organization schema for the brand (used on the homepage).
export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/m2n-logo.png`,
    description: BRAND_SHORT_DESCRIPTION,
  };
}

// Hotel schema for a single property. Only includes fields that are actually
// present (no invented/placeholder data).
export function hotelLd(hotel, { image } = {}) {
  if (!hotel) return null;

  const address = {};
  if (hotel.address_line1) address.streetAddress = hotel.address_line1;
  if (hotel.city) address.addressLocality = hotel.city;
  if (hotel.state) address.addressRegion = hotel.state;
  if (hotel.postal_code) address.postalCode = hotel.postal_code;
  if (hotel.country) address.addressCountry = hotel.country;

  const data = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: hotel.name,
    url: `${SITE_URL}/hotels/${hotel.slug}`,
  };

  if (hotel.description) data.description = hotel.description;
  if (Object.keys(address).length > 0) {
    data.address = { "@type": "PostalAddress", ...address };
  }
  if (hotel.phone && !isPlaceholderPhone(hotel.phone)) {
    data.telephone = hotel.phone.trim();
  }
  if (hotel.email) data.email = hotel.email;
  if (hotel.star_rating) {
    data.starRating = {
      "@type": "Rating",
      ratingValue: String(hotel.star_rating),
    };
  }
  const img = absolute(image);
  if (img) data.image = img;

  return data;
}
