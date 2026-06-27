const LOCAL_GALLERY_IMAGES = [
  "/hotel-exterior-2.jpg",
  "/hotel-exterior.jpg",
  "/lobby.jpg",
  "/reception.jpg",
  "/banquet.jpg",
  "/hotel-exterior-3.jpg",
  "/hotel-outside.jpg",
  "/hotel-entrance.jpg",
  "/reception-2.jpg",
  "/reception-3.jpg",
  "/reception-4.jpg",
  "/reception-5.jpg",
  "/banquet-2.jpg",
  "/banquet-3.jpg",
  "/banquet-4.jpg",
  "/banquet-5.jpg",
  "/banquet-6.jpg",
  "/banquet-7.jpg",
  "/banquet-8.jpg",
];

// Room fallbacks by sort order: Standard, Deluxe, Suite.
// Only /room.jpg is a true guest-room photo; dedicated Deluxe/Suite shots
// (/room-2.jpg, /room-3.jpg) are not in public yet. Suite must avoid banquet
// photos, so it falls back to a neutral interior shot.
const LOCAL_ROOM_IMAGES = ["/room.jpg", "/room.jpg", "/reception-2.jpg"];

const DEFAULT_HERO_IMAGE = "/hotel-exterior-2.jpg";
const DEFAULT_CARD_IMAGE = "/hotel-exterior.jpg";
const DEFAULT_ROOM_IMAGE = LOCAL_ROOM_IMAGES[0];

// Remote backup used only if local assets are unavailable.
const REMOTE_BACKUP_IMAGE =
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1800&q=80";

function isUsableImageUrl(url) {
  if (typeof url !== "string" || url.length === 0) return false;
  return url.startsWith("http") || url.startsWith("/");
}

export function resolveMediaUrl(media, index = 0) {
  if (media && isUsableImageUrl(media.url)) return media.url;
  return LOCAL_GALLERY_IMAGES[index % LOCAL_GALLERY_IMAGES.length] || REMOTE_BACKUP_IMAGE;
}

export function resolveRoomTypeImage(roomType, index = 0) {
  if (roomType && isUsableImageUrl(roomType.image_url)) {
    return roomType.image_url;
  }
  return LOCAL_ROOM_IMAGES[index % LOCAL_ROOM_IMAGES.length] || DEFAULT_ROOM_IMAGE;
}

export function resolveHeroImage(hotel) {
  if (!hotel?.media || hotel.media.length === 0) return DEFAULT_HERO_IMAGE;
  const cover = hotel.media.find((item) => item.is_cover) ?? hotel.media[0];
  return resolveMediaUrl(cover, 0);
}

export function resolveCardImage(hotel) {
  if (!hotel?.media || hotel.media.length === 0) return DEFAULT_CARD_IMAGE;
  // Prefer the secondary front-view shot for cards so it differs from the hero.
  const candidate = hotel.media[1] ?? hotel.media[0];
  return resolveMediaUrl(candidate, 1);
}
