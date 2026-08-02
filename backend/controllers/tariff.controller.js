const { query } = require("../config/db");
const { sendSuccess } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/error.middleware");
const { buildPublicTariff } = require("../utils/buildPublicTariff");

const TARIFF_RATE_FIELDS = `
  tr.id, tr.hotel_id, tr.room_type_id, tr.meal_plan, tr.occupancy,
  tr.price, tr.display_note, tr.valid_from, tr.valid_to,
  tr.status, tr.sort_order, tr.metadata, tr.created_at, tr.updated_at
`;

const getTariffsByHotelSlug = asyncHandler(async (req, res) => {
  const slug =
    typeof req.query.hotel_slug === "string" ? req.query.hotel_slug.trim() : "";
  if (!slug) {
    throw new AppError("hotel_slug query parameter is required", 400);
  }

  const hotelResult = await query(
    `SELECT id, slug, name, currency_code, check_in_time, check_out_time, metadata
     FROM hotels
     WHERE slug = $1 AND status = 'active'
     LIMIT 1`,
    [slug]
  );

  if (hotelResult.rows.length === 0) {
    throw new AppError(`Hotel not found: ${slug}`, 404);
  }

  const hotel = hotelResult.rows[0];

  const roomTypeId =
    typeof req.query.room_type_id === "string" &&
    /^[0-9a-f-]{36}$/i.test(req.query.room_type_id)
      ? req.query.room_type_id
      : null;

  const ratesResult = await query(
    `SELECT ${TARIFF_RATE_FIELDS}
     FROM tariff_rates tr
     WHERE tr.hotel_id = $1 AND tr.status = 'active'
     ORDER BY tr.sort_order ASC, tr.created_at ASC`,
    [hotel.id]
  );

  const tariff = buildPublicTariff(hotel, ratesResult.rows, { roomTypeId });

  return sendSuccess(res, 200, {
    data: {
      hotel_slug: hotel.slug,
      hotel_name: hotel.name,
      ...tariff,
    },
  });
});

module.exports = {
  getTariffsByHotelSlug,
};
