import fs from "node:fs";
import path from "node:path";
import { API_BASE_URL } from "@/lib/api";

const GALLERY_CATEGORIES = [
  "Exterior",
  "Reception",
  "Lobby",
  "Rooms",
  "Bathroom",
  "Banquet",
];

const CATEGORY_CAPTIONS = {
  Hero: "Hotel",
  Exterior: "Exterior",
  Reception: "Reception",
  Lobby: "Lobby",
  Rooms: "Rooms",
  Bathroom: "Bathroom",
  Banquet: "Banquet hall",
};

const UPLOAD_CATEGORY_PATTERN =
  /\/uploads\/hotels\/[^/]+\/([^/]+)\/[^/]+$/i;

const PHOTOS_CATEGORY_PATTERN = /\/Photos\/[^/]+\/([^/]+)\/[^/]+$/i;

// Remote stock/demo image hosts are never real property photography. Seeded
// placeholder rows on these hosts must not win over a hotel's own images.
const PLACEHOLDER_MEDIA_HOSTS = [
  "images.unsplash.com",
  "unsplash.com",
  "source.unsplash.com",
  "placehold.co",
  "placeholder.com",
  "via.placeholder.com",
  "picsum.photos",
  "loremflickr.com",
  "dummyimage.com",
];

function isAbsoluteUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

export function isPlaceholderMediaUrl(url) {
  if (!isAbsoluteUrl(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return PLACEHOLDER_MEDIA_HOSTS.some(
      (blocked) => host === blocked || host.endsWith(`.${blocked}`)
    );
  } catch {
    return false;
  }
}

export function isUsableImageUrl(url) {
  if (typeof url !== "string" || url.length === 0) return false;
  return isAbsoluteUrl(url) || url.startsWith("/");
}

export function resolvePublicMediaUrl(url) {
  if (!isUsableImageUrl(url)) return null;
  if (isAbsoluteUrl(url)) return url;
  if (url.startsWith("/uploads/")) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

function localPublicPathExists(url) {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return false;
  if (url.startsWith("/uploads/")) return true;
  try {
    const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function isResolvableMediaUrl(url) {
  if (!isUsableImageUrl(url)) return false;
  if (isPlaceholderMediaUrl(url)) return false;
  if (isAbsoluteUrl(url) || url.startsWith("/uploads/")) return true;
  return localPublicPathExists(url);
}

// The public hotel API pre-filters to active rows and omits the status column,
// so treat a missing status as active but honour it whenever it is present.
function isActiveMedia(item) {
  const status = item?.status;
  return status === undefined || status === null || status === "active";
}

export function inferMediaCategory(item) {
  const fromUrl =
    item?.url?.match(UPLOAD_CATEGORY_PATTERN)?.[1] ||
    item?.url?.match(PHOTOS_CATEGORY_PATTERN)?.[1];
  if (fromUrl) {
    const normalized =
      fromUrl.charAt(0).toUpperCase() + fromUrl.slice(1).toLowerCase();
    if (GALLERY_CATEGORIES.includes(normalized) || normalized === "Hero") {
      return normalized;
    }
  }

  const caption = (item?.caption || item?.alt_text || "").toLowerCase();
  if (caption.includes("exterior")) return "Exterior";
  if (caption.includes("reception")) return "Reception";
  if (caption.includes("lobby")) return "Lobby";
  if (caption.includes("room")) return "Rooms";
  if (caption.includes("bath")) return "Bathroom";
  if (caption.includes("banquet")) return "Banquet";
  if (caption.includes("hero")) return "Hero";
  return "Gallery";
}

export function getActiveHotelMedia(hotel) {
  const media = hotel?.media;
  if (!Array.isArray(media) || media.length === 0) return [];

  const active = media
    .filter((item) => isActiveMedia(item) && isResolvableMediaUrl(item?.url))
    .map((item) => ({
      ...item,
      url: resolvePublicMediaUrl(item.url),
      category: inferMediaCategory(item),
    }))
    .sort((a, b) => {
      if (Boolean(a.is_cover) !== Boolean(b.is_cover)) {
        return a.is_cover ? -1 : 1;
      }
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

  // Exactly one cover drives the hero; extra covers fall back to sort_order.
  let coverSeen = false;
  return active.map((item) => {
    if (!item.is_cover) return item;
    if (coverSeen) return { ...item, is_cover: false };
    coverSeen = true;
    return item;
  });
}

export function pickCoverMedia(hotel, preferredCategories = ["Hero", "Exterior"]) {
  const media = getActiveHotelMedia(hotel);
  if (media.length === 0) return null;

  const cover = media.find((item) => item.is_cover);
  if (cover) return cover;

  for (const category of preferredCategories) {
    const match = media.find((item) => item.category === category);
    if (match) return match;
  }

  return media[0];
}

export function buildGalleryItemsFromMedia(hotel) {
  const media = getActiveHotelMedia(hotel);
  const items = [];
  let order = 0;

  for (const category of GALLERY_CATEGORIES) {
    const inCategory = media.filter((item) => item.category === category);
    for (const item of inCategory) {
      const caption = CATEGORY_CAPTIONS[category] || category;
      items.push({
        id: item.id || `${category}-${order}`,
        url: item.url,
        alt_text: item.alt_text || (hotel?.name ? `${hotel.name} — ${caption}` : caption),
        caption: item.caption || caption,
        sort_order: item.sort_order || order + 1,
        is_cover: Boolean(item.is_cover) || order === 0,
      });
      order += 1;
    }
  }

  const uncategorized = media.filter(
    (item) => !GALLERY_CATEGORIES.includes(item.category) && item.category !== "Hero"
  );
  for (const item of uncategorized) {
    const caption = item.caption || item.alt_text || "Gallery";
    items.push({
      id: item.id || `gallery-${order}`,
      url: item.url,
      alt_text: item.alt_text || caption,
      caption,
      sort_order: item.sort_order || order + 1,
      is_cover: Boolean(item.is_cover) || order === 0,
    });
    order += 1;
  }

  return items;
}

export { GALLERY_CATEGORIES, CATEGORY_CAPTIONS };
