const { query } = require("../config/db");
const { sendSuccess } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/error.middleware");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_ROOM_TYPE_STATUSES = new Set(["draft", "active", "inactive", "archived"]);
const ALLOWED_ROOM_STATUSES = new Set([
  "available",
  "occupied",
  "maintenance",
  "blocked",
  "out_of_service",
]);

const ROOM_TYPE_FIELDS = `
  rt.id, rt.hotel_id, rt.slug, rt.name, rt.description,
  rt.base_price, rt.max_occupancy, rt.bed_type, rt.room_size_sqft,
  rt.status, rt.sort_order, rt.metadata, rt.created_at, rt.updated_at,
  h.slug AS hotel_slug, h.name AS hotel_name
`;

const ROOM_FIELDS = `
  r.id, r.hotel_id, r.room_type_id, r.room_number, r.floor_label,
  r.status, r.notes, r.created_at, r.updated_at,
  h.slug AS hotel_slug, h.name AS hotel_name,
  rt.slug AS room_type_slug, rt.name AS room_type_name,
  rt.base_price AS room_type_base_price,
  rt.max_occupancy AS room_type_max_occupancy
`;

const listRoomTypes = asyncHandler(async (req, res) => {
  const conditions = [];
  const params = [];

  if (typeof req.query.hotel_slug === "string" && req.query.hotel_slug.length > 0) {
    params.push(req.query.hotel_slug);
    conditions.push(`h.slug = $${params.length}`);
  }

  const requestedStatus = typeof req.query.status === "string" ? req.query.status : null;
  const status = requestedStatus && ALLOWED_ROOM_TYPE_STATUSES.has(requestedStatus)
    ? requestedStatus
    : "active";
  params.push(status);
  conditions.push(`rt.status = $${params.length}`);

  const where = `WHERE ${conditions.join(" AND ")}`;

  const result = await query(
    `SELECT ${ROOM_TYPE_FIELDS}
     FROM room_types rt
     INNER JOIN hotels h ON h.id = rt.hotel_id
     ${where}
     ORDER BY rt.sort_order ASC, rt.base_price ASC`,
    params
  );

  return sendSuccess(res, 200, {
    count: result.rows.length,
    data: result.rows,
  });
});

const getRoomTypeBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const params = [slug];
  let hotelClause = "";

  if (typeof req.query.hotel_slug === "string" && req.query.hotel_slug.length > 0) {
    params.push(req.query.hotel_slug);
    hotelClause = `AND h.slug = $${params.length}`;
  }

  const result = await query(
    `SELECT ${ROOM_TYPE_FIELDS}
     FROM room_types rt
     INNER JOIN hotels h ON h.id = rt.hotel_id
     WHERE rt.slug = $1 ${hotelClause}
     ORDER BY rt.created_at ASC
     LIMIT 1`,
    params
  );

  if (result.rows.length === 0) {
    throw new AppError(`Room type not found: ${slug}`, 404);
  }

  return sendSuccess(res, 200, { data: result.rows[0] });
});

const listRooms = asyncHandler(async (req, res) => {
  const conditions = [];
  const params = [];

  if (typeof req.query.hotel_slug === "string" && req.query.hotel_slug.length > 0) {
    params.push(req.query.hotel_slug);
    conditions.push(`h.slug = $${params.length}`);
  }

  if (typeof req.query.room_type_slug === "string" && req.query.room_type_slug.length > 0) {
    params.push(req.query.room_type_slug);
    conditions.push(`rt.slug = $${params.length}`);
  }

  if (typeof req.query.status === "string" && ALLOWED_ROOM_STATUSES.has(req.query.status)) {
    params.push(req.query.status);
    conditions.push(`r.status = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT ${ROOM_FIELDS}
     FROM rooms r
     INNER JOIN hotels h ON h.id = r.hotel_id
     INNER JOIN room_types rt ON rt.id = r.room_type_id
     ${where}
     ORDER BY r.room_number ASC`,
    params
  );

  return sendSuccess(res, 200, {
    count: result.rows.length,
    data: result.rows,
  });
});

const getRoomById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Room not found: ${id}`, 404);
  }

  const result = await query(
    `SELECT ${ROOM_FIELDS}
     FROM rooms r
     INNER JOIN hotels h ON h.id = r.hotel_id
     INNER JOIN room_types rt ON rt.id = r.room_type_id
     WHERE r.id = $1
     LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Room not found: ${id}`, 404);
  }

  return sendSuccess(res, 200, { data: result.rows[0] });
});

module.exports = {
  listRoomTypes,
  getRoomTypeBySlug,
  listRooms,
  getRoomById,
};
