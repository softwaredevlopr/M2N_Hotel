const { query } = require("../config/db");
const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/error.middleware");
const { ALLOWED_HOTEL_STATUSES } = require("../validators/adminHotel.validator");

const HOTEL_FIELDS = `
  id, slug, name, tagline, description, email, phone, website_url,
  address_line1, address_line2, city, state, country, postal_code,
  timezone, check_in_time, check_out_time, currency_code, star_rating,
  status, is_featured, metadata, created_at, updated_at
`;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/;

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

function parseStarRating(value, errors) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    errors.push("star_rating must be an integer between 1 and 5");
    return null;
  }
  return n;
}

function parseTime(value, field, errors) {
  if (value === undefined || value === null || value === "") return null;
  const raw = String(value).trim();
  if (!TIME_REGEX.test(raw)) {
    errors.push(`${field} must be HH:MM or HH:MM:SS`);
    return null;
  }
  return raw.length === 5 ? `${raw}:00` : raw;
}

function parseIsFeatured(value) {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }
  return false;
}

function parseMetadata(value, errors) {
  if (value === undefined || value === null || value === "") {
    return {};
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
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

function buildHotelPayload(body, { partial = false } = {}) {
  const errors = [];
  const payload = {};

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

  const stringFields = [
    "tagline",
    "description",
    "email",
    "phone",
    "website_url",
    "address_line1",
    "address_line2",
    "city",
    "state",
    "country",
    "postal_code",
    "timezone",
    "currency_code",
  ];

  stringFields.forEach((field) => {
    if (!partial || body[field] !== undefined) {
      let value = emptyToNull(body[field]);
      if (field === "currency_code" && value) {
        value = String(value).toUpperCase().slice(0, 3);
      }
      if (field === "country" && value === null && !partial) {
        value = "India";
      }
      if (field === "timezone" && value === null && !partial) {
        value = "Asia/Kolkata";
      }
      if (field === "currency_code" && value === null && !partial) {
        value = "INR";
      }
      payload[field] = value;
    }
  });

  if (!partial || body.check_in_time !== undefined) {
    const t = parseTime(body.check_in_time, "check_in_time", errors);
    payload.check_in_time = t === null && !partial ? "14:00:00" : t;
  }

  if (!partial || body.check_out_time !== undefined) {
    const t = parseTime(body.check_out_time, "check_out_time", errors);
    payload.check_out_time = t === null && !partial ? "11:00:00" : t;
  }

  if (!partial || body.star_rating !== undefined) {
    payload.star_rating = parseStarRating(body.star_rating, errors);
  }

  if (!partial || body.status !== undefined) {
    const status = emptyToNull(body.status) || (!partial ? "draft" : undefined);
    if (status !== undefined) {
      if (!ALLOWED_HOTEL_STATUSES.includes(status)) {
        errors.push(`status must be one of: ${ALLOWED_HOTEL_STATUSES.join(", ")}`);
      } else {
        payload.status = status;
      }
    }
  }

  if (!partial || body.is_featured !== undefined) {
    payload.is_featured = parseIsFeatured(body.is_featured);
  }

  if (!partial || body.metadata !== undefined) {
    payload.metadata = parseMetadata(body.metadata, errors);
  }

  return { payload, errors };
}

const listHotels = asyncHandler(async (req, res) => {
  const q =
    typeof req.query.q === "string" && req.query.q.trim()
      ? req.query.q.trim()
      : null;
  const status =
    typeof req.query.status === "string" &&
    ALLOWED_HOTEL_STATUSES.includes(req.query.status)
      ? req.query.status
      : null;

  const params = [];
  const conditions = [];

  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(name ILIKE $${params.length} OR slug ILIKE $${params.length} OR city ILIKE $${params.length})`
    );
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT ${HOTEL_FIELDS}
     FROM hotels
     ${where}
     ORDER BY created_at DESC`,
    params
  );

  return sendSuccess(res, 200, {
    count: result.rows.length,
    data: result.rows,
  });
});

const getHotelById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Hotel not found: ${id}`, 404);
  }

  const result = await query(
    `SELECT ${HOTEL_FIELDS} FROM hotels WHERE id = $1 LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Hotel not found: ${id}`, 404);
  }

  return sendSuccess(res, 200, { data: result.rows[0] });
});

const createHotel = asyncHandler(async (req, res) => {
  const { payload, errors } = buildHotelPayload(req.body || {}, { partial: false });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  try {
    const result = await query(
      `INSERT INTO hotels (
         slug, name, tagline, description, email, phone, website_url,
         address_line1, address_line2, city, state, country, postal_code,
         timezone, check_in_time, check_out_time, currency_code, star_rating,
         status, is_featured, metadata
       )
       VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb
       )
       RETURNING ${HOTEL_FIELDS}`,
      [
        payload.slug,
        payload.name,
        payload.tagline,
        payload.description,
        payload.email,
        payload.phone,
        payload.website_url,
        payload.address_line1,
        payload.address_line2,
        payload.city,
        payload.state,
        payload.country || "India",
        payload.postal_code,
        payload.timezone || "Asia/Kolkata",
        payload.check_in_time || "14:00:00",
        payload.check_out_time || "11:00:00",
        payload.currency_code || "INR",
        payload.star_rating,
        payload.status || "draft",
        payload.is_featured === true,
        JSON.stringify(payload.metadata || {}),
      ]
    );

    return sendSuccess(res, 201, { data: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("A hotel with this slug already exists", 409);
    }
    throw error;
  }
});

const updateHotel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Hotel not found: ${id}`, 404);
  }

  const existing = await query(`SELECT id FROM hotels WHERE id = $1 LIMIT 1`, [
    id,
  ]);
  if (existing.rows.length === 0) {
    throw new AppError(`Hotel not found: ${id}`, 404);
  }

  const { payload, errors } = buildHotelPayload(req.body || {}, { partial: true });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const columns = Object.keys(payload);
  if (columns.length === 0) {
    return sendValidationError(res, ["No fields provided to update"]);
  }

  const sets = [];
  const params = [];
  columns.forEach((col) => {
    params.push(col === "metadata" ? JSON.stringify(payload[col]) : payload[col]);
    if (col === "metadata") {
      sets.push(`metadata = $${params.length}::jsonb`);
    } else {
      sets.push(`${col} = $${params.length}`);
    }
  });
  params.push(id);

  try {
    const result = await query(
      `UPDATE hotels
       SET ${sets.join(", ")}
       WHERE id = $${params.length}
       RETURNING ${HOTEL_FIELDS}`,
      params
    );
    return sendSuccess(res, 200, { data: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError("A hotel with this slug already exists", 409);
    }
    throw error;
  }
});

const deleteHotel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Hotel not found: ${id}`, 404);
  }

  const result = await query(
    `DELETE FROM hotels WHERE id = $1
     RETURNING id, slug, name`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Hotel not found: ${id}`, 404);
  }

  return sendSuccess(res, 200, {
    message: "Hotel deleted",
    data: result.rows[0],
  });
});

module.exports = {
  listHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
};
