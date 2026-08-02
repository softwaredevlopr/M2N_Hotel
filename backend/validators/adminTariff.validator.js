const {
  ALLOWED_TARIFF_STATUSES,
  MEAL_PLANS,
  OCCUPANCY_TYPES,
} = require("../utils/tariffConstants");

const createTariffSchema = {
  body: {
    hotel_id: { required: true, type: "string", minLength: 1, maxLength: 36 },
    room_type_id: { type: "string", maxLength: 36 },
    meal_plan: { required: true, type: "string", minLength: 1, maxLength: 40 },
    occupancy: { required: true, type: "string", minLength: 1, maxLength: 20 },
    price: { type: "number" },
    display_note: { type: "string", maxLength: 255 },
    valid_from: { type: "string", maxLength: 10 },
    valid_to: { type: "string", maxLength: 10 },
    status: { type: "string", enum: ALLOWED_TARIFF_STATUSES },
    sort_order: { type: "number" },
  },
};

const updateTariffSchema = {
  body: {
    hotel_id: { type: "string", minLength: 1, maxLength: 36 },
    room_type_id: { type: "string", maxLength: 36 },
    meal_plan: { type: "string", minLength: 1, maxLength: 40 },
    occupancy: { type: "string", minLength: 1, maxLength: 20 },
    price: { type: "number" },
    display_note: { type: "string", maxLength: 255 },
    valid_from: { type: "string", maxLength: 10 },
    valid_to: { type: "string", maxLength: 10 },
    status: { type: "string", enum: ALLOWED_TARIFF_STATUSES },
    sort_order: { type: "number" },
  },
};

const updateTariffSettingsSchema = {
  body: {
    note: { type: "string", maxLength: 4000 },
    extra_bed: { type: "number" },
    gst: { type: "string", maxLength: 120 },
    cancellation_policy: { type: "string", maxLength: 8000 },
    unavailable_label: { type: "string", maxLength: 255 },
  },
};

module.exports = {
  ALLOWED_TARIFF_STATUSES,
  MEAL_PLANS,
  OCCUPANCY_TYPES,
  createTariffSchema,
  updateTariffSchema,
  updateTariffSettingsSchema,
};
