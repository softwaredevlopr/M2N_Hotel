const ALLOWED_ROOM_TYPE_STATUSES = [
  "draft",
  "active",
  "inactive",
  "archived",
];

const createRoomTypeSchema = {
  body: {
    hotel_id: { required: true, type: "string", minLength: 1, maxLength: 36 },
    slug: { required: true, type: "string", minLength: 1, maxLength: 120 },
    name: { required: true, type: "string", minLength: 1, maxLength: 150 },
    description: { type: "string", maxLength: 20000 },
    base_price: { type: "number" },
    max_occupancy: { type: "number" },
    bed_type: { type: "string", maxLength: 80 },
    room_size_sqft: { type: "number" },
    status: { type: "string", enum: ALLOWED_ROOM_TYPE_STATUSES },
    sort_order: { type: "number" },
  },
};

const updateRoomTypeSchema = {
  body: {
    hotel_id: { type: "string", minLength: 1, maxLength: 36 },
    slug: { type: "string", minLength: 1, maxLength: 120 },
    name: { type: "string", minLength: 1, maxLength: 150 },
    description: { type: "string", maxLength: 20000 },
    base_price: { type: "number" },
    max_occupancy: { type: "number" },
    bed_type: { type: "string", maxLength: 80 },
    room_size_sqft: { type: "number" },
    status: { type: "string", enum: ALLOWED_ROOM_TYPE_STATUSES },
    sort_order: { type: "number" },
  },
};

module.exports = {
  ALLOWED_ROOM_TYPE_STATUSES,
  createRoomTypeSchema,
  updateRoomTypeSchema,
};
