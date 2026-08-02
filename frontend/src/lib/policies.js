import { ON_REQUEST, getHotelTariff } from "@/lib/tariffs";

const DEFAULT_POLICY_LINKS = [
  { label: "Cancellation Policy", href: "#tariff" },
  { label: "Privacy Notice", href: "#" },
  { label: "Terms of Stay", href: "#" },
  { label: "Careers", href: "#" },
];

const BRAND_POLICY_LINKS = [
  { label: "Cancellation Policy", href: "#" },
  { label: "Privacy Notice", href: "#" },
  { label: "Terms of Stay", href: "#" },
  { label: "Careers", href: "#" },
];

function normalizePolicyLink(entry) {
  if (!entry) return null;
  if (typeof entry === "string") {
    return { label: entry, href: "#" };
  }
  if (typeof entry.label !== "string" || entry.label.trim().length === 0) {
    return null;
  }
  return {
    label: entry.label.trim(),
    href: typeof entry.href === "string" && entry.href.length > 0 ? entry.href : "#",
  };
}

export function getHotelPolicyLinks(hotel) {
  const fromMeta = hotel?.metadata?.policies;
  if (Array.isArray(fromMeta) && fromMeta.length > 0) {
    const links = fromMeta.map(normalizePolicyLink).filter(Boolean);
    if (links.length > 0) return links;
  }

  if (!hotel) return BRAND_POLICY_LINKS;

  const tariff = getHotelTariff(hotel);
  const links = [...DEFAULT_POLICY_LINKS];
  if (!tariff?.cancellationPolicy) {
    links[0] = { label: "Cancellation Policy", href: "#" };
  }
  return links;
}

export function getHotelSocialLinks(hotel) {
  const fromMeta = hotel?.metadata?.socials;
  if (!Array.isArray(fromMeta)) return [];
  return fromMeta
    .map((entry) => {
      if (!entry?.href || !entry?.label) return null;
      return {
        label: entry.label,
        href: entry.href,
        platform: entry.platform || entry.label,
      };
    })
    .filter(Boolean);
}

export function getMapsDirectionsUrl(hotel, previewQuery) {
  const fromMeta = hotel?.metadata?.maps_directions_url;
  if (typeof fromMeta === "string" && fromMeta.trim().length > 0) {
    return fromMeta.trim();
  }

  if (previewQuery) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      previewQuery
    )}`;
  }

  return null;
}

export { ON_REQUEST };
