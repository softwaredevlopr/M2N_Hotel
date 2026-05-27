const { query } = require("../config/db");
const { sendSuccess } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/error.middleware");

const HOTEL_PUBLIC_FIELDS = `
  id, slug, name, tagline, description, email, phone, website_url,
  address_line1, address_line2, city, state, country, postal_code,
  timezone, check_in_time, check_out_time, currency_code, star_rating,
  status, is_featured, metadata, created_at, updated_at
`;

const ALLOWED_HOTEL_STATUSES = new Set(["draft", "active", "inactive", "archived"]);

function clampLimit(value, fallback = 50, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function clampOffset(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

const listHotels = asyncHandler(async (req, res) => {
  const requestedStatus = typeof req.query.status === "string" ? req.query.status : null;
  const status = requestedStatus && ALLOWED_HOTEL_STATUSES.has(requestedStatus)
    ? requestedStatus
    : "active";
  const limit = clampLimit(req.query.limit);
  const offset = clampOffset(req.query.offset);

  const result = await query(
    `SELECT ${HOTEL_PUBLIC_FIELDS}
     FROM hotels
     WHERE status = $1
     ORDER BY is_featured DESC, created_at DESC
     LIMIT $2 OFFSET $3`,
    [status, limit, offset]
  );

  return sendSuccess(res, 200, {
    count: result.rows.length,
    data: result.rows,
  });
});

const getHotelBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const hotelResult = await query(
    `SELECT ${HOTEL_PUBLIC_FIELDS} FROM hotels WHERE slug = $1 LIMIT 1`,
    [slug]
  );

  if (hotelResult.rows.length === 0) {
    throw new AppError(`Hotel not found: ${slug}`, 404);
  }

  const hotel = hotelResult.rows[0];

  const mediaResult = await query(
    `SELECT id, media_type, url, alt_text, caption, sort_order, is_cover
     FROM hotel_media
     WHERE hotel_id = $1 AND status = 'active'
     ORDER BY is_cover DESC, sort_order ASC, created_at ASC`,
    [hotel.id]
  );

  const amenitiesResult = await query(
    `SELECT a.id, a.slug, a.name, a.description, a.category, a.icon,
            ha.is_highlighted, ha.notes
     FROM hotel_amenities ha
     INNER JOIN amenities a ON a.id = ha.amenity_id
     WHERE ha.hotel_id = $1 AND a.is_active = TRUE
     ORDER BY ha.is_highlighted DESC, a.category ASC, a.name ASC`,
    [hotel.id]
  );

  return sendSuccess(res, 200, {
    data: {
      ...hotel,
      media: mediaResult.rows,
      amenities: amenitiesResult.rows,
    },
  });
});

module.exports = {
  listHotels,
  getHotelBySlug,
};
