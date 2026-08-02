const ALLOWED_ROOM_STATUSES = [
  "available",
  "occupied",
  "maintenance",
  "blocked",
  "out_of_service",
];

const createRoomSchema = {
  body: {
    hotel_id: { required: true, type: "string", minLength: 1, maxLength: 36 },
    room_type_id: { required: true, type: "string", minLength: 1, maxLength: 36 },
    room_number: { required: true, type: "string", minLength: 1, maxLength: 30 },
    floor_label: { type: "string", maxLength: 30 },
    status: { type: "string", enum: ALLOWED_ROOM_STATUSES },
    notes: { type: "string", maxLength: 20000 },
  },
};

const updateRoomSchema = {
  body: {
    hotel_id: { type: "string", minLength: 1, maxLength: 36 },
    room_type_id: { type: "string", minLength: 1, maxLength: 36 },
    room_number: { type: "string", minLength: 1, maxLength: 30 },
    floor_label: { type: "string", maxLength: 30 },
    status: { type: "string", enum: ALLOWED_ROOM_STATUSES },
    notes: { type: "string", maxLength: 20000 },
  },
};

module.exports = {
  ALLOWED_ROOM_STATUSES,
  createRoomSchema,
  updateRoomSchema,
};
