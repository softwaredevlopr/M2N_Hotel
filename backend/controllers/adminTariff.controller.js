const { query } = require("../config/db");
const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/error.middleware");
const {
  MEAL_PLANS,
  OCCUPANCY_TYPES,
  ALLOWED_TARIFF_STATUSES,
} = require("../utils/tariffConstants");
const {
  appendPermittedHotelScope,
  assertHotelAccess,
  assertHotelRecordAccess,
  assertResourceHotelAccess,
} = require("../utils/adminTenancy");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TARIFF_FIELDS = `
  tr.id, tr.hotel_id, tr.room_type_id, tr.meal_plan, tr.occupancy,
  tr.price, tr.display_note, tr.valid_from, tr.valid_to,
  tr.status, tr.sort_order, tr.metadata, tr.created_at, tr.updated_at,
  h.slug AS hotel_slug, h.name AS hotel_name,
  rt.slug AS room_type_slug, rt.name AS room_type_name
`;

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return typeof value === "string" ? value.trim() : value;
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

function parseDateField(value, fieldName, errors) {
  const raw = emptyToNull(value);
  if (raw === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    errors.push(`${fieldName} must be YYYY-MM-DD`);
    return null;
  }
  return raw;
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

  if (!partial || body.room_type_id !== undefined) {
    const roomTypeId = emptyToNull(body.room_type_id);
    if (roomTypeId === null) {
      payload.room_type_id = null;
    } else if (!UUID_REGEX.test(roomTypeId)) {
      errors.push("room_type_id must be a valid UUID");
    } else {
      payload.room_type_id = roomTypeId;
    }
  }

  if (!partial || body.meal_plan !== undefined) {
    const mealPlan = emptyToNull(body.meal_plan);
    const allowed = MEAL_PLANS.map((p) => p.id);
    if (!mealPlan) errors.push("meal_plan is required");
    else if (!allowed.includes(mealPlan)) {
      errors.push(`meal_plan must be one of: ${allowed.join(", ")}`);
    } else {
      payload.meal_plan = mealPlan;
    }
  }

  if (!partial || body.occupancy !== undefined) {
    const occupancy = emptyToNull(body.occupancy);
    if (!occupancy) errors.push("occupancy is required");
    else if (!OCCUPANCY_TYPES.includes(occupancy)) {
      errors.push(`occupancy must be one of: ${OCCUPANCY_TYPES.join(", ")}`);
    } else {
      payload.occupancy = occupancy;
    }
  }

  if (!partial || body.price !== undefined) {
    if (body.price === "" || body.price === null || body.price === undefined) {
      payload.price = null;
    } else {
      const n = Number(body.price);
      if (!Number.isFinite(n) || n < 0) {
        errors.push("price must be a number >= 0");
      } else {
        payload.price = n;
      }
    }
  }

  if (!partial || body.display_note !== undefined) {
    const note = emptyToNull(body.display_note);
    if (note && note.length > 255) {
      errors.push("display_note must be at most 255 characters");
    } else {
      payload.display_note = note;
    }
  }

  if (!partial || body.valid_from !== undefined) {
    payload.valid_from = parseDateField(body.valid_from, "valid_from", errors);
  }

  if (!partial || body.valid_to !== undefined) {
    payload.valid_to = parseDateField(body.valid_to, "valid_to", errors);
  }

  if (
    payload.valid_from &&
    payload.valid_to &&
    payload.valid_from > payload.valid_to
  ) {
    errors.push("valid_from must be on or before valid_to");
  }

  if (!partial || body.status !== undefined) {
    const status = emptyToNull(body.status) || (!partial ? "active" : undefined);
    if (status !== undefined) {
      if (!ALLOWED_TARIFF_STATUSES.includes(status)) {
        errors.push(
          `status must be one of: ${ALLOWED_TARIFF_STATUSES.join(", ")}`
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

  if (!partial || body.metadata !== undefined) {
    payload.metadata = parseMetadata(body.metadata, errors);
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return { payload, errors };
}

async function assertHotelExists(hotelId) {
  const hotel = await query(`SELECT id FROM hotels WHERE id = $1 LIMIT 1`, [
    hotelId,
  ]);
  if (hotel.rows.length === 0) {
    throw new AppError(`Hotel not found: ${hotelId}`, 404);
  }
}

async function assertRoomTypeForHotel(roomTypeId, hotelId) {
  const result = await query(
    `SELECT id FROM room_types WHERE id = $1 AND hotel_id = $2 LIMIT 1`,
    [roomTypeId, hotelId]
  );
  if (result.rows.length === 0) {
    throw new AppError(
      "room_type_id does not belong to the selected hotel",
      400
    );
  }
}

const listTariffs = asyncHandler(async (req, res) => {
  const hotelId =
    typeof req.query.hotel_id === "string" && UUID_REGEX.test(req.query.hotel_id)
      ? req.query.hotel_id
      : null;
  const roomTypeId =
    typeof req.query.room_type_id === "string" &&
    UUID_REGEX.test(req.query.room_type_id)
      ? req.query.room_type_id
      : null;
  const mealPlan =
    typeof req.query.meal_plan === "string" ? req.query.meal_plan.trim() : null;
  const occupancy =
    typeof req.query.occupancy === "string" ? req.query.occupancy.trim() : null;
  const status =
    typeof req.query.status === "string" &&
    ALLOWED_TARIFF_STATUSES.includes(req.query.status)
      ? req.query.status
      : null;

  const params = [];
  const conditions = [];

  if (hotelId) {
    appendPermittedHotelScope(conditions, params, req.tenancy, "tr.hotel_id", hotelId);
  } else {
    appendPermittedHotelScope(conditions, params, req.tenancy, "tr.hotel_id");
  }
  if (roomTypeId) {
    params.push(roomTypeId);
    conditions.push(`tr.room_type_id = $${params.length}`);
  }
  if (mealPlan) {
    params.push(mealPlan);
    conditions.push(`tr.meal_plan = $${params.length}`);
  }
  if (occupancy) {
    params.push(occupancy);
    conditions.push(`tr.occupancy = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`tr.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT ${TARIFF_FIELDS}
     FROM tariff_rates tr
     INNER JOIN hotels h ON h.id = tr.hotel_id
     LEFT JOIN room_types rt ON rt.id = tr.room_type_id
     ${where}
     ORDER BY h.name ASC, tr.sort_order ASC, tr.meal_plan ASC, tr.occupancy ASC`,
    params
  );

  return sendSuccess(res, 200, {
    count: result.rows.length,
    data: result.rows,
  });
});

const getTariffById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertResourceHotelAccess(req.tenancy, {
    table: "tariff_rates",
    idColumn: "id",
    id,
    notFoundMessage: `Tariff rate not found: ${id}`,
  });

  const result = await query(
    `SELECT ${TARIFF_FIELDS}
     FROM tariff_rates tr
     INNER JOIN hotels h ON h.id = tr.hotel_id
     LEFT JOIN room_types rt ON rt.id = tr.room_type_id
     WHERE tr.id = $1
     LIMIT 1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Tariff rate not found: ${id}`, 404);
  }

  return sendSuccess(res, 200, { data: result.rows[0] });
});

const createTariff = asyncHandler(async (req, res) => {
  const { payload, errors } = buildPayload(req.body || {}, { partial: false });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  assertHotelAccess(req.tenancy, payload.hotel_id);

  await assertHotelExists(payload.hotel_id);
  if (payload.room_type_id) {
    await assertRoomTypeForHotel(payload.room_type_id, payload.hotel_id);
  }

  const result = await query(
    `INSERT INTO tariff_rates (
       hotel_id, room_type_id, meal_plan, occupancy, price, display_note,
       valid_from, valid_to, status, sort_order, metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
     RETURNING id`,
    [
      payload.hotel_id,
      payload.room_type_id ?? null,
      payload.meal_plan,
      payload.occupancy,
      payload.price ?? null,
      payload.display_note ?? null,
      payload.valid_from ?? null,
      payload.valid_to ?? null,
      payload.status || "active",
      payload.sort_order ?? 0,
      JSON.stringify(payload.metadata || {}),
    ]
  );

  const created = await query(
    `SELECT ${TARIFF_FIELDS}
     FROM tariff_rates tr
     INNER JOIN hotels h ON h.id = tr.hotel_id
     LEFT JOIN room_types rt ON rt.id = tr.room_type_id
     WHERE tr.id = $1
     LIMIT 1`,
    [result.rows[0].id]
  );

  return sendSuccess(res, 201, { data: created.rows[0] });
});

const updateTariff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertResourceHotelAccess(req.tenancy, {
    table: "tariff_rates",
    idColumn: "id",
    id,
    notFoundMessage: `Tariff rate not found: ${id}`,
  });

  const existing = await query(
    `SELECT id, hotel_id FROM tariff_rates WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (existing.rows.length === 0) {
    throw new AppError(`Tariff rate not found: ${id}`, 404);
  }

  const { payload, errors } = buildPayload(req.body || {}, { partial: true });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const hotelId = payload.hotel_id || existing.rows[0].hotel_id;
  if (payload.hotel_id) {
    assertHotelAccess(req.tenancy, payload.hotel_id);
    await assertHotelExists(payload.hotel_id);
  }
  if (payload.room_type_id) {
    await assertRoomTypeForHotel(payload.room_type_id, hotelId);
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

  await query(
    `UPDATE tariff_rates SET ${sets.join(", ")} WHERE id = $${params.length}`,
    params
  );

  const updated = await query(
    `SELECT ${TARIFF_FIELDS}
     FROM tariff_rates tr
     INNER JOIN hotels h ON h.id = tr.hotel_id
     LEFT JOIN room_types rt ON rt.id = tr.room_type_id
     WHERE tr.id = $1
     LIMIT 1`,
    [id]
  );

  return sendSuccess(res, 200, { data: updated.rows[0] });
});

const deleteTariff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertResourceHotelAccess(req.tenancy, {
    table: "tariff_rates",
    idColumn: "id",
    id,
    notFoundMessage: `Tariff rate not found: ${id}`,
  });

  const result = await query(
    `DELETE FROM tariff_rates WHERE id = $1
     RETURNING id, hotel_id, meal_plan, occupancy`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Tariff rate not found: ${id}`, 404);
  }

  return sendSuccess(res, 200, {
    message: "Tariff rate deleted",
    data: result.rows[0],
  });
});

const getTariffSettings = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  await assertHotelRecordAccess(req.tenancy, hotelId);

  const result = await query(
    `SELECT id, slug, name, metadata FROM hotels WHERE id = $1 LIMIT 1`,
    [hotelId]
  );
  if (result.rows.length === 0) {
    throw new AppError(`Hotel not found: ${hotelId}`, 404);
  }

  const hotel = result.rows[0];
  const settings =
    hotel.metadata?.tariff_settings &&
    typeof hotel.metadata.tariff_settings === "object"
      ? hotel.metadata.tariff_settings
      : {};

  return sendSuccess(res, 200, {
    data: {
      hotel_id: hotel.id,
      hotel_slug: hotel.slug,
      hotel_name: hotel.name,
      settings,
    },
  });
});

const updateTariffSettings = asyncHandler(async (req, res) => {
  const { hotelId } = req.params;
  await assertHotelRecordAccess(req.tenancy, hotelId);

  const existing = await query(
    `SELECT id, metadata FROM hotels WHERE id = $1 LIMIT 1`,
    [hotelId]
  );
  if (existing.rows.length === 0) {
    throw new AppError(`Hotel not found: ${hotelId}`, 404);
  }

  const currentMeta =
    existing.rows[0].metadata && typeof existing.rows[0].metadata === "object"
      ? existing.rows[0].metadata
      : {};

  const incoming =
    req.body?.settings && typeof req.body.settings === "object"
      ? req.body.settings
      : req.body;

  const settings = {
    ...(currentMeta.tariff_settings || {}),
    ...(incoming || {}),
  };

  const nextMeta = {
    ...currentMeta,
    tariff_settings: settings,
  };

  await query(`UPDATE hotels SET metadata = $1::jsonb WHERE id = $2`, [
    JSON.stringify(nextMeta),
    hotelId,
  ]);

  return sendSuccess(res, 200, {
    data: {
      hotel_id: hotelId,
      settings,
    },
  });
});

module.exports = {
  listTariffs,
  getTariffById,
  createTariff,
  updateTariff,
  deleteTariff,
  getTariffSettings,
  updateTariffSettings,
};
