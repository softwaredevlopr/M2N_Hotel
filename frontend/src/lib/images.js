const HOTEL_MEDIA_FALLBACKS = [
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1800&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1400&q=80",
];

const ROOM_TYPE_IMAGE_BY_SLUG = {
  "standard-room":
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80",
  "deluxe-room":
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80",
  "royal-suite":
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
};

const DEFAULT_ROOM_IMAGE =
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80";

const DEFAULT_HERO_IMAGE = HOTEL_MEDIA_FALLBACKS[0];

function isReachableHttpUrl(url) {
  if (typeof url !== "string" || url.length === 0) return false;
  if (!url.startsWith("http")) return false;
  if (url.includes("m2nhotel.in")) return false;
  return true;
}

export function resolveMediaUrl(media, index = 0) {
  if (media && isReachableHttpUrl(media.url)) return media.url;
  return HOTEL_MEDIA_FALLBACKS[index % HOTEL_MEDIA_FALLBACKS.length];
}

export function resolveRoomTypeImage(roomType) {
  if (!roomType) return DEFAULT_ROOM_IMAGE;
  if (roomType.image_url && isReachableHttpUrl(roomType.image_url)) {
    return roomType.image_url;
  }
  if (roomType.slug && ROOM_TYPE_IMAGE_BY_SLUG[roomType.slug]) {
    return ROOM_TYPE_IMAGE_BY_SLUG[roomType.slug];
  }
  return DEFAULT_ROOM_IMAGE;
}

export function resolveHeroImage(hotel) {
  if (!hotel?.media || hotel.media.length === 0) return DEFAULT_HERO_IMAGE;
  const cover = hotel.media.find((item) => item.is_cover) ?? hotel.media[0];
  return resolveMediaUrl(cover, 0);
}
