const { query } = require("../config/db");
const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/error.middleware");
const {
  ALLOWED_ROOM_TYPE_STATUSES,
} = require("../validators/adminRoomType.validator");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROOM_TYPE_FIELDS = `
  rt.id, rt.hotel_id, rt.slug, rt.name, rt.description,
  rt.base_price, rt.max_occupancy, rt.bed_type, rt.room_size_sqft,
  rt.status, rt.sort_order, rt.metadata, rt.created_at, rt.updated_at,
  h.slug AS hotel_slug, h.name AS hotel_name
`;

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return typeof value === "string" ? value.trim() : value;
}

function normalizeSlug(slug) {
  return String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function parseBool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function parseMetadata(value, errors) {
  if (value === undefined || value === null || value === "") return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // fall through
    }
  }
  errors.push("metadata must be a JSON object");
  return {};
}

/**
 * Featured is not a DB column on room_types. Persist as metadata.is_featured
 * (existing JSONB column — no schema change).
 */
function withFeaturedFlag(row) {
  if (!row) return row;
  const meta =
    row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    ...row,
    is_featured: Boolean(meta.is_featured),
  };
}

function buildPayload(body, { partial = false } = {}) {
  const errors = [];
  const payload = {};

  if (!partial || body.hotel_id !== undefined) {
    const hotelId = emptyToNull(body.hotel_id);
    if (!hotelId) errors.push("hotel_id is required");
    else if (!UUID_REGEX.test(hotelId)) errors.push("hotel_id must be a valid UUID");
    else payload.hotel_id = hotelId;
  }

  if (!partial || body.slug !== undefined) {
    const slug = normalizeSlug(body.slug);
    if (!slug) errors.push("slug is required");
    else payload.slug = slug;
  }

  if (!partial || body.name !== undefined) {
    const name = emptyToNull(body.name);
    if (!name) errors.push("name is required");
    else payload.name = name;
  }

  if (!partial || body.description !== undefined) {
    payload.description = emptyToNull(body.description);
  }

  if (!partial || body.bed_type !== undefined) {
    payload.bed_type = emptyToNull(body.bed_type);
  }

  if (!partial || body.base_price !== undefined) {
    if (body.base_price === "" || body.base_price === null || body.base_price === undefined) {
      payload.base_price = partial ? undefined : 0;
      if (!partial) payload.base_price = 0;
    } else {
      const n = Number(body.base_price);
      if (!Number.isFinite(n) || n < 0) {
        errors.push("base_price must be a number >= 0");
      } else {
        payload.base_price = n;
      }
    }
  }

  if (!partial || body.max_occupancy !== undefined) {
    if (
      body.max_occupancy === "" ||
      body.max_occupancy === null ||
      body.max_occupancy === undefined
    ) {
      if (!partial) payload.max_occupancy = 2;
    } else {
      const n = Number(body.max_occupancy);
      if (!Number.isInteger(n) || n < 1) {
        errors.push("max_occupancy must be an integer >= 1");
      } else {
        payload.max_occupancy = n;
      }
    }
  }

  if (!partial || body.room_size_sqft !== undefined) {
    if (
      body.room_size_sqft === "" ||
      body.room_size_sqft === null ||
      body.room_size_sqft === undefined
    ) {
      payload.room_size_sqft = null;
    } else {
      const n = Number(body.room_size_sqft);
      if (!Number.isInteger(n) || n <= 0) {
        errors.push("room_size_sqft must be an integer > 0");
      } else {
        payload.room_size_sqft = n;
      }
    }
  }

  if (!partial || body.status !== undefined) {
    const status = emptyToNull(body.status) || (!partial ? "draft" : undefined);
    if (status !== undefined) {
      if (!ALLOWED_ROOM_TYPE_STATUSES.includes(status)) {
        errors.push(
          `status must be one of: ${ALLOWED_ROOM_TYPE_STATUSES.join(", ")}`
        );
      } else {
        payload.status = status;
      }
    }
  }

  if (!partial || body.sort_order !== undefined) {
    if (
      body.sort_order === "" ||
      body.sort_order === null ||
      body.sort_order === undefined
    ) {
      if (!partial) payload.sort_order = 0;
    } else {
      const n = Number(body.sort_order);
      if (!Number.isInteger(n)) {
        errors.push("sort_order must be an integer");
      } else {
        payload.sort_order = n;
      }
    }
  }

  // Merge featured into metadata without inventing a column.
  let metadata;
  if (!partial || body.metadata !== undefined || body.is_featured !== undefined) {
    metadata = parseMetadata(body.metadata, errors);
    if (body.is_featured !== undefined) {
      metadata = { ...metadata, is_featured: parseBool(body.is_featured) };
    }
    payload.metadata = metadata;
  }

  // Clean undefined keys for partial updates
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return { payload, errors };
}

const listRoomTypes = asyncHandler(async (req, res) => {
  const q =
    typeof req.query.q === "string" && req.query.q.trim()
      ? req.query.q.trim()
      : null;
  const hotelId =
    typeof req.query.hotel_id === "string" && UUID_REGEX.test(req.query.hotel_id)
      ? req.query.hotel_id
      : null;
  const status =
    typeof req.query.status === "string" &&
    ALLOWED_ROOM_TYPE_STATUSES.includes(req.query.status)
      ? req.query.status
      : null;
  const featuredOnly =
    req.query.featured === "true" || req.query.featured === "1";

  const params = [];
  const conditions = [];

  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(rt.name ILIKE $${params.length} OR rt.slug ILIKE $${params.length} OR rt.bed_type ILIKE $${params.length})`
    );
  }
  if (hotelId) {
    params.push(hotelId);
    conditions.push(`rt.hotel_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`rt.status = $${params.length}`);
  }
  if (featuredOnly) {
    conditions.push(`(rt.metadata->>'is_featured') = 'true'`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT ${ROOM_TYPE_FIELDS}
     FROM room_types rt
     INNER JOIN hotels h ON h.id = rt.hotel_id
     ${where}
     ORDER BY rt.sort_order ASC, rt.name ASC`,
    params
  );

  return sendSuccess(res, 200, {
    count: result.rows.length,
    data: result.rows.map(withFeaturedFlag),
  });
});

const getRoomTypeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Room type not found: ${id}`, 404);
  }

  const result = await query(
    `SELECT ${ROOM_TYPE_FIELDS}
     FROM room_types rt
     INNER JOIN hotels h ON h.id = rt.hotel_id
     WHERE rt.id = $1
     LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Room type not found: ${id}`, 404);
  }

  return sendSuccess(res, 200, { data: withFeaturedFlag(result.rows[0]) });
});

const createRoomType = asyncHandler(async (req, res) => {
  const { payload, errors } = buildPayload(req.body || {}, { partial: false });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const hotel = await query(`SELECT id FROM hotels WHERE id = $1 LIMIT 1`, [
    payload.hotel_id,
  ]);
  if (hotel.rows.length === 0) {
    throw new AppError(`Hotel not found: ${payload.hotel_id}`, 404);
  }

  try {
    const result = await query(
      `INSERT INTO room_types (
         hotel_id, slug, name, description, base_price, max_occupancy,
         bed_type, room_size_sqft, status, sort_order, metadata
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
       RETURNING id`,
      [
        payload.hotel_id,
        payload.slug,
        payload.name,
        payload.description,
        payload.base_price ?? 0,
        payload.max_occupancy ?? 2,
        payload.bed_type,
        payload.room_size_sqft,
        payload.status || "draft",
        payload.sort_order ?? 0,
        JSON.stringify(payload.metadata || {}),
      ]
    );

    const created = await query(
      `SELECT ${ROOM_TYPE_FIELDS}
       FROM room_types rt
       INNER JOIN hotels h ON h.id = rt.hotel_id
       WHERE rt.id = $1
       LIMIT 1`,
      [result.rows[0].id]
    );

    return sendSuccess(res, 201, { data: withFeaturedFlag(created.rows[0]) });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError(
        "A room type with this slug already exists for the hotel",
        409
      );
    }
    throw error;
  }
});

const updateRoomType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Room type not found: ${id}`, 404);
  }

  const existing = await query(
    `SELECT id, hotel_id, metadata FROM room_types WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (existing.rows.length === 0) {
    throw new AppError(`Room type not found: ${id}`, 404);
  }

  const { payload, errors } = buildPayload(req.body || {}, { partial: true });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  // When only is_featured is patched, merge onto existing metadata.
  if (payload.metadata && req.body?.metadata === undefined) {
    const current =
      existing.rows[0].metadata && typeof existing.rows[0].metadata === "object"
        ? existing.rows[0].metadata
        : {};
    payload.metadata = { ...current, ...payload.metadata };
  }

  if (payload.hotel_id) {
    const hotel = await query(`SELECT id FROM hotels WHERE id = $1 LIMIT 1`, [
      payload.hotel_id,
    ]);
    if (hotel.rows.length === 0) {
      throw new AppError(`Hotel not found: ${payload.hotel_id}`, 404);
    }
  }

  const columns = Object.keys(payload);
  if (columns.length === 0) {
    return sendValidationError(res, ["No fields provided to update"]);
  }

  const sets = [];
  const params = [];
  columns.forEach((col) => {
    params.push(
      col === "metadata" ? JSON.stringify(payload[col]) : payload[col]
    );
    if (col === "metadata") {
      sets.push(`metadata = $${params.length}::jsonb`);
    } else {
      sets.push(`${col} = $${params.length}`);
    }
  });
  params.push(id);

  try {
    await query(
      `UPDATE room_types SET ${sets.join(", ")} WHERE id = $${params.length}`,
      params
    );

    const updated = await query(
      `SELECT ${ROOM_TYPE_FIELDS}
       FROM room_types rt
       INNER JOIN hotels h ON h.id = rt.hotel_id
       WHERE rt.id = $1
       LIMIT 1`,
      [id]
    );

    return sendSuccess(res, 200, { data: withFeaturedFlag(updated.rows[0]) });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError(
        "A room type with this slug already exists for the hotel",
        409
      );
    }
    throw error;
  }
});

const deleteRoomType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Room type not found: ${id}`, 404);
  }

  const result = await query(
    `DELETE FROM room_types WHERE id = $1
     RETURNING id, slug, name, hotel_id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Room type not found: ${id}`, 404);
  }

  return sendSuccess(res, 200, {
    message: "Room type deleted",
    data: result.rows[0],
  });
});

module.exports = {
  listRoomTypes,
  getRoomTypeById,
  createRoomType,
  updateRoomType,
  deleteRoomType,
};
