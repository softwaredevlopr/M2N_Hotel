const path = require("path");
const fs = require("fs");
const { query } = require("../config/db");
const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/error.middleware");
const {
  MEDIA_CATEGORIES,
  ALLOWED_MEDIA_TYPES,
  ALLOWED_MEDIA_STATUSES,
  getCategoryFromUrl,
  setCategoryOnUrl,
  uploadsRoot,
  ensureDir,
} = require("../utils/mediaCategory");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MEDIA_FIELDS = `
  m.id, m.hotel_id, m.media_type, m.url, m.alt_text, m.caption,
  m.sort_order, m.is_cover, m.status, m.created_at, m.updated_at,
  h.slug AS hotel_slug, h.name AS hotel_name
`;

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return typeof value === "string" ? value.trim() : value;
}

function parseBool(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function withCategory(row) {
  if (!row) return row;
  return {
    ...row,
    category: getCategoryFromUrl(row.url),
  };
}

function localUploadPathFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const clean = url.split("?")[0];
  if (!clean.startsWith("/uploads/")) return null;
  const relative = clean.replace(/^\/uploads\//, "");
  return path.normalize(path.join(uploadsRoot(), relative));
}

async function assertHotelExists(hotelId) {
  const result = await query(`SELECT id FROM hotels WHERE id = $1 LIMIT 1`, [
    hotelId,
  ]);
  if (result.rows.length === 0) {
    throw new AppError(`Hotel not found: ${hotelId}`, 404);
  }
}

async function clearOtherCovers(hotelId, exceptId = null) {
  if (exceptId) {
    await query(
      `UPDATE hotel_media SET is_cover = FALSE
       WHERE hotel_id = $1 AND id <> $2 AND is_cover = TRUE`,
      [hotelId, exceptId]
    );
  } else {
    await query(
      `UPDATE hotel_media SET is_cover = FALSE
       WHERE hotel_id = $1 AND is_cover = TRUE`,
      [hotelId]
    );
  }
}

function tryDeleteLocalFile(url) {
  const filePath = localUploadPathFromUrl(url);
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Non-fatal: DB row still deleted.
  }
}

function tryMoveLocalFile(oldUrl, newUrl) {
  const from = localUploadPathFromUrl(oldUrl);
  const to = localUploadPathFromUrl(newUrl);
  if (!from || !to || from === to) return newUrl;
  try {
    if (!fs.existsSync(from)) return newUrl;
    ensureDir(path.dirname(to));
    fs.renameSync(from, to);
    return newUrl;
  } catch {
    return oldUrl;
  }
}

const listMedia = asyncHandler(async (req, res) => {
  const q =
    typeof req.query.q === "string" && req.query.q.trim()
      ? req.query.q.trim()
      : null;
  const hotelId =
    typeof req.query.hotel_id === "string" && UUID_REGEX.test(req.query.hotel_id)
      ? req.query.hotel_id
      : null;
  const category =
    typeof req.query.category === "string" &&
    MEDIA_CATEGORIES.includes(req.query.category)
      ? req.query.category
      : null;
  const status =
    typeof req.query.status === "string" &&
    ALLOWED_MEDIA_STATUSES.includes(req.query.status)
      ? req.query.status
      : null;

  const params = [];
  const conditions = [];

  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(m.alt_text ILIKE $${params.length} OR m.caption ILIKE $${params.length} OR m.url ILIKE $${params.length})`
    );
  }
  if (hotelId) {
    params.push(hotelId);
    conditions.push(`m.hotel_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`m.status = $${params.length}`);
  }
  if (category) {
    params.push(`%/${category}/%`);
    params.push(`%cat=${category}%`);
    conditions.push(
      `(m.url ILIKE $${params.length - 1} OR m.url ILIKE $${params.length})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT ${MEDIA_FIELDS}
     FROM hotel_media m
     INNER JOIN hotels h ON h.id = m.hotel_id
     ${where}
     ORDER BY m.sort_order ASC, m.created_at DESC`,
    params
  );

  return sendSuccess(res, 200, {
    count: result.rows.length,
    data: result.rows.map(withCategory),
  });
});

const getMediaById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Media not found: ${id}`, 404);
  }

  const result = await query(
    `SELECT ${MEDIA_FIELDS}
     FROM hotel_media m
     INNER JOIN hotels h ON h.id = m.hotel_id
     WHERE m.id = $1
     LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Media not found: ${id}`, 404);
  }

  return sendSuccess(res, 200, { data: withCategory(result.rows[0]) });
});

const uploadMedia = asyncHandler(async (req, res) => {
  const hotelId = emptyToNull(req.body?.hotel_id);
  const category = emptyToNull(req.body?.category) || "Gallery";
  const altText = emptyToNull(req.body?.alt_text);
  const caption = emptyToNull(req.body?.caption);
  const status = emptyToNull(req.body?.status) || "active";
  const isCover = parseBool(req.body?.is_cover);
  let sortOrder = 0;
  if (req.body?.sort_order !== undefined && req.body?.sort_order !== "") {
    sortOrder = Number(req.body.sort_order);
  }

  const errors = [];
  if (!hotelId) errors.push("hotel_id is required");
  else if (!UUID_REGEX.test(hotelId)) errors.push("hotel_id must be a valid UUID");
  if (!MEDIA_CATEGORIES.includes(category)) {
    errors.push(`category must be one of: ${MEDIA_CATEGORIES.join(", ")}`);
  }
  if (!ALLOWED_MEDIA_STATUSES.includes(status)) {
    errors.push(`status must be one of: ${ALLOWED_MEDIA_STATUSES.join(", ")}`);
  }
  if (!Number.isInteger(sortOrder)) {
    errors.push("sort_order must be an integer");
  }
  if (!req.file) {
    errors.push("image file is required");
  }
  if (errors.length > 0) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore
      }
    }
    return sendValidationError(res, errors);
  }

  await assertHotelExists(hotelId);

  // File already stored in category folder by multer diskStorage.
  const finalName = path.basename(req.file.filename);
  const url = `/uploads/hotels/${hotelId}/${category}/${finalName}`;

  // If multer fell back to _tmp, move into place.
  const expectedPath = path.join(uploadsRoot(), "hotels", hotelId, category, finalName);
  if (path.normalize(req.file.path) !== path.normalize(expectedPath)) {
    ensureDir(path.dirname(expectedPath));
    fs.renameSync(req.file.path, expectedPath);
  }

  if (isCover) {
    await clearOtherCovers(hotelId);
  }

  const result = await query(
    `INSERT INTO hotel_media (
       hotel_id, media_type, url, alt_text, caption, sort_order, is_cover, status
     )
     VALUES ($1, 'image', $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [hotelId, url, altText, caption, sortOrder, isCover, status]
  );

  const created = await query(
    `SELECT ${MEDIA_FIELDS}
     FROM hotel_media m
     INNER JOIN hotels h ON h.id = m.hotel_id
     WHERE m.id = $1
     LIMIT 1`,
    [result.rows[0].id]
  );

  return sendSuccess(res, 201, { data: withCategory(created.rows[0]) });
});

const updateMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Media not found: ${id}`, 404);
  }

  const existing = await query(
    `SELECT * FROM hotel_media WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (existing.rows.length === 0) {
    throw new AppError(`Media not found: ${id}`, 404);
  }
  const row = existing.rows[0];
  const body = req.body || {};
  const errors = [];
  const payload = {};

  if (body.hotel_id !== undefined) {
    const hotelId = emptyToNull(body.hotel_id);
    if (!hotelId) errors.push("hotel_id is required");
    else if (!UUID_REGEX.test(hotelId)) errors.push("hotel_id must be a valid UUID");
    else payload.hotel_id = hotelId;
  }

  if (body.media_type !== undefined) {
    const mediaType = emptyToNull(body.media_type);
    if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
      errors.push(`media_type must be one of: ${ALLOWED_MEDIA_TYPES.join(", ")}`);
    } else {
      payload.media_type = mediaType;
    }
  }

  if (body.alt_text !== undefined) {
    payload.alt_text = emptyToNull(body.alt_text);
  }
  if (body.caption !== undefined) {
    payload.caption = emptyToNull(body.caption);
  }
  if (body.status !== undefined) {
    const status = emptyToNull(body.status);
    if (!ALLOWED_MEDIA_STATUSES.includes(status)) {
      errors.push(`status must be one of: ${ALLOWED_MEDIA_STATUSES.join(", ")}`);
    } else {
      payload.status = status;
    }
  }
  if (body.sort_order !== undefined && body.sort_order !== "") {
    const n = Number(body.sort_order);
    if (!Number.isInteger(n)) errors.push("sort_order must be an integer");
    else payload.sort_order = n;
  }
  if (body.is_cover !== undefined) {
    payload.is_cover = parseBool(body.is_cover);
  }

  let nextUrl = row.url;
  if (body.url !== undefined) {
    const url = emptyToNull(body.url);
    if (!url) errors.push("url is required");
    else nextUrl = url;
  }

  if (body.category !== undefined) {
    const category = emptyToNull(body.category);
    if (!MEDIA_CATEGORIES.includes(category)) {
      errors.push(`category must be one of: ${MEDIA_CATEGORIES.join(", ")}`);
    } else {
      const rewritten = setCategoryOnUrl(nextUrl, category);
      if (rewritten !== nextUrl) {
        nextUrl = tryMoveLocalFile(nextUrl, rewritten.split("?")[0]) || rewritten;
        // If move used path without query, re-apply category encoding if needed.
        if (getCategoryFromUrl(nextUrl) !== category) {
          nextUrl = setCategoryOnUrl(nextUrl, category);
        }
      }
    }
  }

  if (nextUrl !== row.url) {
    payload.url = nextUrl;
  }

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const columns = Object.keys(payload);
  if (columns.length === 0) {
    return sendValidationError(res, ["No fields provided to update"]);
  }

  const nextHotelId = payload.hotel_id || row.hotel_id;
  if (payload.hotel_id) {
    await assertHotelExists(payload.hotel_id);
  }

  if (payload.is_cover === true) {
    await clearOtherCovers(nextHotelId, id);
  }

  const sets = [];
  const params = [];
  columns.forEach((col) => {
    params.push(payload[col]);
    sets.push(`${col} = $${params.length}`);
  });
  params.push(id);

  await query(
    `UPDATE hotel_media SET ${sets.join(", ")} WHERE id = $${params.length}`,
    params
  );

  const updated = await query(
    `SELECT ${MEDIA_FIELDS}
     FROM hotel_media m
     INNER JOIN hotels h ON h.id = m.hotel_id
     WHERE m.id = $1
     LIMIT 1`,
    [id]
  );

  return sendSuccess(res, 200, { data: withCategory(updated.rows[0]) });
});

const deleteMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Media not found: ${id}`, 404);
  }

  const result = await query(
    `DELETE FROM hotel_media WHERE id = $1
     RETURNING id, hotel_id, url, is_cover`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Media not found: ${id}`, 404);
  }

  tryDeleteLocalFile(result.rows[0].url);

  return sendSuccess(res, 200, {
    message: "Media deleted",
    data: result.rows[0],
  });
});

module.exports = {
  listMedia,
  getMediaById,
  uploadMedia,
  updateMedia,
  deleteMedia,
};
