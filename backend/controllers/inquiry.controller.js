const { query } = require("../config/db");
const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/error.middleware");
const { INQUIRY_STATUSES } = require("../validators/inquiry.validator");
const {
  appendPermittedHotelScope,
  assertHotelAccess,
  assertResourceHotelAccess,
} = require("../utils/adminTenancy");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const INQUIRY_FIELDS = `
  i.id, i.hotel_id, i.room_type_id, i.guest_name, i.guest_email, i.guest_phone,
  to_char(i.check_in_date, 'YYYY-MM-DD') AS check_in_date,
  to_char(i.check_out_date, 'YYYY-MM-DD') AS check_out_date,
  i.adults_count, i.children_count,
  i.message, i.source, i.status, i.admin_notes, i.created_at, i.updated_at,
  h.slug AS hotel_slug, h.name AS hotel_name,
  rt.slug AS room_type_slug, rt.name AS room_type_name
`;

function parseOptionalDate(value, field, errors) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !ISO_DATE_REGEX.test(value)) {
    errors.push(`${field} must be in YYYY-MM-DD format`);
    return null;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    errors.push(`${field} is not a valid calendar date`);
    return null;
  }
  return value;
}

function parseOptionalInteger(value, field, errors, { min = 0 } = {}) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    errors.push(`${field} must be an integer >= ${min}`);
    return null;
  }
  return parsed;
}

const createInquiry = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const errors = [];

  const checkIn = parseOptionalDate(body.check_in_date, "check_in_date", errors);
  const checkOut = parseOptionalDate(body.check_out_date, "check_out_date", errors);

  if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
    errors.push("check_out_date must be after check_in_date");
  }

  const adults = parseOptionalInteger(body.adults_count, "adults_count", errors, { min: 1 });
  const children = parseOptionalInteger(body.children_count, "children_count", errors, { min: 0 });

  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const hotelResult = await query(
    `SELECT id FROM hotels WHERE slug = $1 LIMIT 1`,
    [body.hotel_slug]
  );

  if (hotelResult.rows.length === 0) {
    throw new AppError(`Hotel not found: ${body.hotel_slug}`, 404);
  }

  const hotelId = hotelResult.rows[0].id;
  let roomTypeId = null;

  if (body.room_type_slug) {
    const roomTypeResult = await query(
      `SELECT id FROM room_types WHERE hotel_id = $1 AND slug = $2 LIMIT 1`,
      [hotelId, body.room_type_slug]
    );

    if (roomTypeResult.rows.length === 0) {
      throw new AppError(`Room type not found: ${body.room_type_slug}`, 404);
    }

    roomTypeId = roomTypeResult.rows[0].id;
  }

  const source = body.source || "website";

  const insertResult = await query(
    `INSERT INTO inquiries (
       hotel_id, room_type_id, guest_name, guest_email, guest_phone,
       check_in_date, check_out_date, adults_count, children_count,
       message, source, status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
     RETURNING id, hotel_id, room_type_id, guest_name, guest_email, guest_phone,
               to_char(check_in_date, 'YYYY-MM-DD') AS check_in_date,
               to_char(check_out_date, 'YYYY-MM-DD') AS check_out_date,
               adults_count, children_count,
               message, source, status, admin_notes, created_at, updated_at`,
    [
      hotelId,
      roomTypeId,
      body.guest_name,
      body.guest_email,
      body.guest_phone || null,
      checkIn,
      checkOut,
      adults === null ? 1 : adults,
      children === null ? 0 : children,
      body.message || null,
      source,
    ]
  );

  return sendSuccess(res, 201, { data: insertResult.rows[0] });
});

/**
 * Admin list — supports status filter, hotel_slug, and q search across
 * guest name / email / phone. Returns total for pagination.
 */
const listInquiries = asyncHandler(async (req, res) => {
  const conditions = [];
  const params = [];

  if (
    typeof req.query.hotel_id === "string" &&
    UUID_REGEX.test(req.query.hotel_id)
  ) {
    appendPermittedHotelScope(
      conditions,
      params,
      req.tenancy,
      "i.hotel_id",
      req.query.hotel_id
    );
  } else if (typeof req.query.hotel_slug === "string" && req.query.hotel_slug.length > 0) {
    params.push(req.query.hotel_slug);
    conditions.push(`h.slug = $${params.length}`);
    if (!req.tenancy.isPlatformAdmin) {
      params.push(req.tenancy.permittedHotelIds);
      conditions.push(`i.hotel_id = ANY($${params.length}::uuid[])`);
    }
  } else {
    appendPermittedHotelScope(conditions, params, req.tenancy, "i.hotel_id");
  }

  if (
    typeof req.query.status === "string" &&
    INQUIRY_STATUSES.includes(req.query.status)
  ) {
    params.push(req.query.status);
    conditions.push(`i.status = $${params.length}`);
  }

  if (typeof req.query.q === "string" && req.query.q.trim().length > 0) {
    const term = `%${req.query.q.trim()}%`;
    params.push(term);
    const idx = params.length;
    conditions.push(
      `(i.guest_name ILIKE $${idx} OR i.guest_email ILIKE $${idx} OR COALESCE(i.guest_phone, '') ILIKE $${idx})`
    );
  }

  const limit = (() => {
    const parsed = Number(req.query.limit);
    if (!Number.isFinite(parsed) || parsed <= 0) return 50;
    return Math.min(parsed, 100);
  })();
  const offset = (() => {
    const parsed = Number(req.query.offset);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  })();

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query(
    `SELECT COUNT(*)::int AS total
     FROM inquiries i
     INNER JOIN hotels h ON h.id = i.hotel_id
     LEFT JOIN room_types rt ON rt.id = i.room_type_id
     ${where}`,
    params
  );
  const total = countResult.rows[0]?.total || 0;

  const listParams = [...params, limit, offset];
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const result = await query(
    `SELECT ${INQUIRY_FIELDS}
     FROM inquiries i
     INNER JOIN hotels h ON h.id = i.hotel_id
     LEFT JOIN room_types rt ON rt.id = i.room_type_id
     ${where}
     ORDER BY i.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams
  );

  return sendSuccess(res, 200, {
    count: result.rows.length,
    total,
    limit,
    offset,
    data: result.rows,
  });
});

const getInquiryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertResourceHotelAccess(req.tenancy, {
    table: "inquiries",
    idColumn: "id",
    id,
    notFoundMessage: `Inquiry not found: ${id}`,
  });

  const result = await query(
    `SELECT ${INQUIRY_FIELDS}
     FROM inquiries i
     INNER JOIN hotels h ON h.id = i.hotel_id
     LEFT JOIN room_types rt ON rt.id = i.room_type_id
     WHERE i.id = $1
     LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Inquiry not found: ${id}`, 404);
  }

  return sendSuccess(res, 200, { data: result.rows[0] });
});

const updateInquiryStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertResourceHotelAccess(req.tenancy, {
    table: "inquiries",
    idColumn: "id",
    id,
    notFoundMessage: `Inquiry not found: ${id}`,
  });

  const adminNotes =
    typeof req.body.admin_notes === "string" && req.body.admin_notes.length > 0
      ? req.body.admin_notes
      : null;

  const result = await query(
    `UPDATE inquiries
     SET status = $1,
         admin_notes = COALESCE($2, admin_notes)
     WHERE id = $3
     RETURNING id, hotel_id, room_type_id, guest_name, guest_email, guest_phone,
               to_char(check_in_date, 'YYYY-MM-DD') AS check_in_date,
               to_char(check_out_date, 'YYYY-MM-DD') AS check_out_date,
               adults_count, children_count,
               message, source, status, admin_notes, created_at, updated_at`,
    [req.body.status, adminNotes, id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Inquiry not found: ${id}`, 404);
  }

  return sendSuccess(res, 200, { data: result.rows[0] });
});

const deleteInquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertResourceHotelAccess(req.tenancy, {
    table: "inquiries",
    idColumn: "id",
    id,
    notFoundMessage: `Inquiry not found: ${id}`,
  });

  const result = await query(
    `DELETE FROM inquiries
     WHERE id = $1
     RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Inquiry not found: ${id}`, 404);
  }

  return sendSuccess(res, 200, {
    message: "Inquiry deleted",
    data: { id: result.rows[0].id },
  });
});

module.exports = {
  createInquiry,
  listInquiries,
  getInquiryById,
  updateInquiryStatus,
  deleteInquiry,
};
