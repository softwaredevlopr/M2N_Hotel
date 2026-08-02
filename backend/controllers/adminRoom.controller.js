const { query } = require("../config/db");
const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { AppError } = require("../middleware/error.middleware");
const { ALLOWED_ROOM_STATUSES } = require("../validators/adminRoom.validator");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROOM_FIELDS = `
  r.id, r.hotel_id, r.room_type_id, r.room_number, r.floor_label,
  r.status, r.notes, r.created_at, r.updated_at,
  h.slug AS hotel_slug, h.name AS hotel_name,
  rt.slug AS room_type_slug, rt.name AS room_type_name
`;

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return typeof value === "string" ? value.trim() : value;
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
    if (!roomTypeId) errors.push("room_type_id is required");
    else if (!UUID_REGEX.test(roomTypeId)) {
      errors.push("room_type_id must be a valid UUID");
    } else {
      payload.room_type_id = roomTypeId;
    }
  }

  if (!partial || body.room_number !== undefined) {
    const roomNumber = emptyToNull(body.room_number);
    if (!roomNumber) errors.push("room_number is required");
    else if (String(roomNumber).length > 30) {
      errors.push("room_number must be at most 30 characters");
    } else {
      payload.room_number = String(roomNumber);
    }
  }

  if (!partial || body.floor_label !== undefined) {
    const floor = emptyToNull(body.floor_label);
    if (floor !== null && String(floor).length > 30) {
      errors.push("floor_label must be at most 30 characters");
    } else {
      payload.floor_label = floor;
    }
  }

  if (!partial || body.status !== undefined) {
    const status = emptyToNull(body.status) || (!partial ? "available" : undefined);
    if (status !== undefined) {
      if (!ALLOWED_ROOM_STATUSES.includes(status)) {
        errors.push(
          `status must be one of: ${ALLOWED_ROOM_STATUSES.join(", ")}`
        );
      } else {
        payload.status = status;
      }
    }
  }

  if (!partial || body.notes !== undefined) {
    payload.notes = emptyToNull(body.notes);
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return { payload, errors };
}

async function assertHotelExists(hotelId) {
  const result = await query(`SELECT id FROM hotels WHERE id = $1 LIMIT 1`, [
    hotelId,
  ]);
  if (result.rows.length === 0) {
    throw new AppError(`Hotel not found: ${hotelId}`, 404);
  }
}

async function assertRoomTypeBelongsToHotel(roomTypeId, hotelId) {
  const result = await query(
    `SELECT id, hotel_id FROM room_types WHERE id = $1 LIMIT 1`,
    [roomTypeId]
  );
  if (result.rows.length === 0) {
    throw new AppError(`Room type not found: ${roomTypeId}`, 404);
  }
  if (result.rows[0].hotel_id !== hotelId) {
    throw new AppError("room_type_id must belong to the selected hotel", 400);
  }
}

const listRooms = asyncHandler(async (req, res) => {
  const q =
    typeof req.query.q === "string" && req.query.q.trim()
      ? req.query.q.trim()
      : null;
  const hotelId =
    typeof req.query.hotel_id === "string" && UUID_REGEX.test(req.query.hotel_id)
      ? req.query.hotel_id
      : null;
  const roomTypeId =
    typeof req.query.room_type_id === "string" &&
    UUID_REGEX.test(req.query.room_type_id)
      ? req.query.room_type_id
      : null;
  const status =
    typeof req.query.status === "string" &&
    ALLOWED_ROOM_STATUSES.includes(req.query.status)
      ? req.query.status
      : null;

  const params = [];
  const conditions = [];

  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(r.room_number ILIKE $${params.length} OR r.floor_label ILIKE $${params.length})`
    );
  }
  if (hotelId) {
    params.push(hotelId);
    conditions.push(`r.hotel_id = $${params.length}`);
  }
  if (roomTypeId) {
    params.push(roomTypeId);
    conditions.push(`r.room_type_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `SELECT ${ROOM_FIELDS}
     FROM rooms r
     INNER JOIN hotels h ON h.id = r.hotel_id
     INNER JOIN room_types rt ON rt.id = r.room_type_id
     ${where}
     ORDER BY h.name ASC, r.room_number ASC`,
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

const createRoom = asyncHandler(async (req, res) => {
  const { payload, errors } = buildPayload(req.body || {}, { partial: false });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  await assertHotelExists(payload.hotel_id);
  await assertRoomTypeBelongsToHotel(payload.room_type_id, payload.hotel_id);

  try {
    const result = await query(
      `INSERT INTO rooms (
         hotel_id, room_type_id, room_number, floor_label, status, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        payload.hotel_id,
        payload.room_type_id,
        payload.room_number,
        payload.floor_label,
        payload.status || "available",
        payload.notes,
      ]
    );

    const created = await query(
      `SELECT ${ROOM_FIELDS}
       FROM rooms r
       INNER JOIN hotels h ON h.id = r.hotel_id
       INNER JOIN room_types rt ON rt.id = r.room_type_id
       WHERE r.id = $1
       LIMIT 1`,
      [result.rows[0].id]
    );

    return sendSuccess(res, 201, { data: created.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError(
        "A room with this number already exists for the hotel",
        409
      );
    }
    if (error.message && error.message.includes("room hotel_id must match")) {
      throw new AppError("room_type_id must belong to the selected hotel", 400);
    }
    throw error;
  }
});

const updateRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Room not found: ${id}`, 404);
  }

  const existing = await query(
    `SELECT id, hotel_id, room_type_id FROM rooms WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (existing.rows.length === 0) {
    throw new AppError(`Room not found: ${id}`, 404);
  }

  const { payload, errors } = buildPayload(req.body || {}, { partial: true });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const columns = Object.keys(payload);
  if (columns.length === 0) {
    return sendValidationError(res, ["No fields provided to update"]);
  }

  const nextHotelId = payload.hotel_id || existing.rows[0].hotel_id;
  const nextRoomTypeId = payload.room_type_id || existing.rows[0].room_type_id;

  if (payload.hotel_id) {
    await assertHotelExists(payload.hotel_id);
  }
  if (payload.hotel_id || payload.room_type_id) {
    await assertRoomTypeBelongsToHotel(nextRoomTypeId, nextHotelId);
  }

  const sets = [];
  const params = [];
  columns.forEach((col) => {
    params.push(payload[col]);
    sets.push(`${col} = $${params.length}`);
  });
  params.push(id);

  try {
    await query(
      `UPDATE rooms SET ${sets.join(", ")} WHERE id = $${params.length}`,
      params
    );

    const updated = await query(
      `SELECT ${ROOM_FIELDS}
       FROM rooms r
       INNER JOIN hotels h ON h.id = r.hotel_id
       INNER JOIN room_types rt ON rt.id = r.room_type_id
       WHERE r.id = $1
       LIMIT 1`,
      [id]
    );

    return sendSuccess(res, 200, { data: updated.rows[0] });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError(
        "A room with this number already exists for the hotel",
        409
      );
    }
    if (error.message && error.message.includes("room hotel_id must match")) {
      throw new AppError("room_type_id must belong to the selected hotel", 400);
    }
    throw error;
  }
});

const deleteRoom = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    throw new AppError(`Room not found: ${id}`, 404);
  }

  const result = await query(
    `DELETE FROM rooms WHERE id = $1
     RETURNING id, hotel_id, room_number, status`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError(`Room not found: ${id}`, 404);
  }

  return sendSuccess(res, 200, {
    message: "Room deleted",
    data: result.rows[0],
  });
});

module.exports = {
  listRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
