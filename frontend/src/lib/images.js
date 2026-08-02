import fs from "node:fs";
import path from "node:path";
import {
  buildGalleryItemsFromMedia,
  getActiveHotelMedia,
  isPlaceholderMediaUrl,
  isUsableImageUrl,
  pickCoverMedia,
  resolvePublicMediaUrl,
} from "@/lib/media";

const PHOTOS_PUBLIC_ROOT = "/Photos";
const PHOTOS_FS_ROOT = path.join(process.cwd(), "public", "Photos");

const HOTEL_PHOTO_FOLDERS = {
  "m2n-hotel-aurelia-grand": "Aurelia-Grand",
  "hotel-zaarang-inn": "Zaarang-Inn",
};

const GALLERY_CATEGORIES = [
  "Exterior",
  "Reception",
  "Lobby",
  "Rooms",
  "Bathroom",
  "Banquet",
];

const ALL_CATEGORIES = ["Hero", ...GALLERY_CATEGORIES];

const CATEGORY_CAPTIONS = {
  Hero: "Hotel",
  Exterior: "Exterior",
  Reception: "Reception",
  Lobby: "Lobby",
  Rooms: "Rooms",
  Bathroom: "Bathroom",
  Banquet: "Banquet hall",
};

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".gif",
]);

const REMOTE_BACKUP_IMAGE =
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1800&q=80";

const photoCache = new Map();

function slugOf(hotelOrSlug) {
  if (typeof hotelOrSlug === "string") return hotelOrSlug;
  return hotelOrSlug?.slug ?? null;
}

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function listCategoryImages(folderName, category) {
  const dir = path.join(PHOTOS_FS_ROOT, folderName, category);
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    )
    .map((entry) => entry.name)
    .sort(naturalCompare)
    .map((name) => `${PHOTOS_PUBLIC_ROOT}/${folderName}/${category}/${name}`);
}

function getHotelPhotos(hotelOrSlug) {
  const slug = slugOf(hotelOrSlug);
  const folderName = slug ? HOTEL_PHOTO_FOLDERS[slug] : null;
  if (!folderName) return null;

  if (photoCache.has(slug)) return photoCache.get(slug);

  const photos = {};
  for (const category of ALL_CATEGORIES) {
    photos[category] = listCategoryImages(folderName, category);
  }
  photoCache.set(slug, photos);
  return photos;
}

function firstAvailableBrandImage() {
  for (const slug of Object.keys(HOTEL_PHOTO_FOLDERS)) {
    const photos = getHotelPhotos(slug);
    if (photos?.Hero?.[0]) return photos.Hero[0];
    if (photos?.Exterior?.[0]) return photos.Exterior[0];
  }
  return REMOTE_BACKUP_IMAGE;
}

export function resolveBrandHeroImage(hotels = []) {
  const featured =
    hotels.find((hotel) => hotel?.is_featured) || hotels[0] || null;
  if (featured) {
    const fromApi = resolveHeroImage(featured);
    if (fromApi && fromApi !== REMOTE_BACKUP_IMAGE) return fromApi;
  }

  const preferredCategories = ["Lobby", "Reception", "Exterior"];
  for (const category of preferredCategories) {
    for (const slug of Object.keys(HOTEL_PHOTO_FOLDERS)) {
      const photos = getHotelPhotos(slug);
      if (photos?.[category]?.[0]) return photos[category][0];
    }
  }
  return firstAvailableBrandImage();
}

function galleryItemsFromPhotos(hotel) {
  const photos = getHotelPhotos(hotel);
  if (!photos) return [];

  const items = [];
  let order = 0;
  for (const category of GALLERY_CATEGORIES) {
    const urls = photos[category];
    if (!Array.isArray(urls) || urls.length === 0) continue;
    for (const url of urls) {
      const caption = CATEGORY_CAPTIONS[category] || category;
      items.push({
        id: `${category}-${order}`,
        url,
        alt_text: hotel?.name ? `${hotel.name} — ${caption}` : caption,
        caption,
        sort_order: order + 1,
        is_cover: order === 0,
      });
      order += 1;
    }
  }
  return items;
}

function heroFromPhotos(hotel) {
  const photos = getHotelPhotos(hotel);
  if (!photos) return null;
  return photos.Hero[0] || photos.Exterior[0] || null;
}

function cardFromPhotos(hotel) {
  const photos = getHotelPhotos(hotel);
  if (!photos) return null;
  return (
    photos.Exterior[0] ||
    photos.Hero[0] ||
    photos.Lobby[0] ||
    null
  );
}

function aboutFromPhotos(hotel) {
  const photos = getHotelPhotos(hotel);
  if (!photos) return null;
  return (
    photos.Lobby[0] ||
    photos.Reception[0] ||
    photos.Rooms[0] ||
    photos.Exterior[0] ||
    photos.Hero[0] ||
    null
  );
}

function roomFromPhotos(hotel, index = 0) {
  const photos = getHotelPhotos(hotel);
  if (!photos?.Rooms?.length) return null;
  return photos.Rooms[index % photos.Rooms.length];
}

function anyPhotoFromHotel(hotel) {
  const photos = getHotelPhotos(hotel);
  if (!photos) return null;
  for (const category of ALL_CATEGORIES) {
    if (photos[category]?.[0]) return photos[category][0];
  }
  return null;
}

// A property must never borrow another property's photography. Once a hotel is
// known the fallback chain stays inside that hotel's own folder; the brand-wide
// fallback is only for hotel-less contexts such as the homepage hero.
function lastResortImage(hotel) {
  if (!hotel) return firstAvailableBrandImage();
  return anyPhotoFromHotel(hotel) || REMOTE_BACKUP_IMAGE;
}

export function resolveMediaUrl(media) {
  const resolved = resolvePublicMediaUrl(media?.url);
  if (resolved) return resolved;
  return firstAvailableBrandImage();
}

export function resolveHeroImage(hotel) {
  const cover = pickCoverMedia(hotel, ["Hero", "Exterior"]);
  if (cover?.url) return cover.url;

  const fromPhotos = heroFromPhotos(hotel);
  if (fromPhotos) return fromPhotos;

  if (!hotel) return firstAvailableBrandImage();

  const media = getActiveHotelMedia(hotel);
  if (media[0]?.url) return media[0].url;

  return lastResortImage(hotel);
}

export function resolveCardImage(hotel) {
  const media = getActiveHotelMedia(hotel);
  const exterior =
    media.find((item) => item.category === "Exterior") ||
    media.find((item) => item.category === "Hero") ||
    media[0];
  if (exterior?.url) return exterior.url;

  const fromPhotos = cardFromPhotos(hotel);
  if (fromPhotos) return fromPhotos;

  return lastResortImage(hotel);
}

export function resolveAboutImage(hotel) {
  const media = getActiveHotelMedia(hotel);
  const interior =
    media.find((item) => item.category === "Lobby") ||
    media.find((item) => item.category === "Reception") ||
    media.find((item) => item.category === "Rooms") ||
    media[1] ||
    media[0];
  if (interior?.url) return interior.url;

  const fromPhotos = aboutFromPhotos(hotel);
  if (fromPhotos) return fromPhotos;

  return resolveHeroImage(hotel);
}

export function resolveRoomTypeImage(roomType, index = 0, hotel) {
  const media = getActiveHotelMedia(hotel);
  const roomMedia = media.filter((item) => item.category === "Rooms");
  if (roomMedia.length > 0) {
    return roomMedia[index % roomMedia.length].url;
  }

  const fromPhotos = roomFromPhotos(hotel, index);
  if (fromPhotos) return fromPhotos;

  if (
    isUsableImageUrl(roomType?.image_url) &&
    !isPlaceholderMediaUrl(roomType.image_url)
  ) {
    return resolvePublicMediaUrl(roomType.image_url) || roomType.image_url;
  }

  return resolveHeroImage(hotel);
}

export function getGalleryItems(hotel) {
  const fromApi = buildGalleryItemsFromMedia(hotel);
  if (fromApi.length > 0) return fromApi;

  const fromPhotos = galleryItemsFromPhotos(hotel);
  if (fromPhotos.length > 0) return fromPhotos;

  return [];
}

export { resolvePublicMediaUrl, getActiveHotelMedia };
