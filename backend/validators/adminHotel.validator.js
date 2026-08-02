const ALLOWED_HOTEL_STATUSES = ["draft", "active", "inactive", "archived"];

const createHotelSchema = {
  body: {
    slug: { required: true, type: "string", minLength: 1, maxLength: 120 },
    name: { required: true, type: "string", minLength: 1, maxLength: 255 },
    tagline: { type: "string", maxLength: 500 },
    description: { type: "string", maxLength: 20000 },
    email: { type: "string", maxLength: 255 },
    phone: { type: "string", maxLength: 50 },
    website_url: { type: "string", maxLength: 500 },
    address_line1: { type: "string", maxLength: 255 },
    address_line2: { type: "string", maxLength: 255 },
    city: { type: "string", maxLength: 120 },
    state: { type: "string", maxLength: 120 },
    country: { type: "string", maxLength: 120 },
    postal_code: { type: "string", maxLength: 20 },
    timezone: { type: "string", maxLength: 64 },
    check_in_time: { type: "string", maxLength: 12 },
    check_out_time: { type: "string", maxLength: 12 },
    currency_code: { type: "string", maxLength: 3 },
    star_rating: { type: "number" },
    status: { type: "string", enum: ALLOWED_HOTEL_STATUSES },
  },
};

const updateHotelSchema = {
  body: {
    slug: { type: "string", minLength: 1, maxLength: 120 },
    name: { type: "string", minLength: 1, maxLength: 255 },
    tagline: { type: "string", maxLength: 500 },
    description: { type: "string", maxLength: 20000 },
    email: { type: "string", maxLength: 255 },
    phone: { type: "string", maxLength: 50 },
    website_url: { type: "string", maxLength: 500 },
    address_line1: { type: "string", maxLength: 255 },
    address_line2: { type: "string", maxLength: 255 },
    city: { type: "string", maxLength: 120 },
    state: { type: "string", maxLength: 120 },
    country: { type: "string", maxLength: 120 },
    postal_code: { type: "string", maxLength: 20 },
    timezone: { type: "string", maxLength: 64 },
    check_in_time: { type: "string", maxLength: 12 },
    check_out_time: { type: "string", maxLength: 12 },
    currency_code: { type: "string", maxLength: 3 },
    star_rating: { type: "number" },
    status: { type: "string", enum: ALLOWED_HOTEL_STATUSES },
  },
};

module.exports = {
  ALLOWED_HOTEL_STATUSES,
  createHotelSchema,
  updateHotelSchema,
};
