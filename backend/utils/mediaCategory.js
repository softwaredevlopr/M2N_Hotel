const path = require("path");
const fs = require("fs");

const MEDIA_CATEGORIES = [
  "Hero",
  "Gallery",
  "Room",
  "Restaurant",
  "Exterior",
  "Lobby",
  "Amenities",
];

const ALLOWED_MEDIA_TYPES = ["image", "video", "document"];
const ALLOWED_MEDIA_STATUSES = ["active", "inactive", "archived"];

/**
 * hotel_media has no category column. Category is encoded in the URL path
 * (`/uploads/hotels/{hotelId}/{Category}/file`) or as `?cat=Category`.
 */
function getCategoryFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  for (const cat of MEDIA_CATEGORIES) {
    if (url.includes(`/${cat}/`)) return cat;
  }
  const match = url.match(/[?&]cat=([A-Za-z]+)/);
  if (match && MEDIA_CATEGORIES.includes(match[1])) return match[1];
  return null;
}

function setCategoryOnUrl(url, category) {
  if (!url || !MEDIA_CATEGORIES.includes(category)) return url;
  const current = getCategoryFromUrl(url);
  if (current === category) return url;

  // Prefer rewriting path segment for local uploads.
  if (current && url.includes(`/${current}/`)) {
    return url.replace(`/${current}/`, `/${category}/`);
  }

  // Strip existing cat query and append.
  let clean = String(url)
    .replace(/([?&])cat=[^&]*/g, "$1")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?")
    .replace(/&&+/g, "&");
  const sep = clean.includes("?") ? "&" : "?";
  return `${clean}${sep}cat=${category}`;
}

function uploadsRoot() {
  return path.join(__dirname, "..", "uploads");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

module.exports = {
  MEDIA_CATEGORIES,
  ALLOWED_MEDIA_TYPES,
  ALLOWED_MEDIA_STATUSES,
  getCategoryFromUrl,
  setCategoryOnUrl,
  uploadsRoot,
  ensureDir,
};
