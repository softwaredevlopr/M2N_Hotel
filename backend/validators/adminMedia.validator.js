const {
  MEDIA_CATEGORIES,
  ALLOWED_MEDIA_TYPES,
  ALLOWED_MEDIA_STATUSES,
} = require("../utils/mediaCategory");

const createMediaSchema = {
  body: {
    hotel_id: { required: true, type: "string", minLength: 1, maxLength: 36 },
    // category validated in controller (multipart fields are strings)
  },
};

const updateMediaSchema = {
  body: {
    hotel_id: { type: "string", minLength: 1, maxLength: 36 },
    media_type: { type: "string", enum: ALLOWED_MEDIA_TYPES },
    url: { type: "string", minLength: 1, maxLength: 2000 },
    alt_text: { type: "string", maxLength: 255 },
    caption: { type: "string", maxLength: 20000 },
    sort_order: { type: "number" },
    status: { type: "string", enum: ALLOWED_MEDIA_STATUSES },
  },
};

module.exports = {
  MEDIA_CATEGORIES,
  ALLOWED_MEDIA_TYPES,
  ALLOWED_MEDIA_STATUSES,
  createMediaSchema,
  updateMediaSchema,
};
