const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { parseUuid, trimOrNull } = require("../validators/booking.validator");
const crmGuestService = require("../services/crmGuest.service");

const listGuests = asyncHandler(async (req, res) => {
  const errors = [];
  const hotelId = parseUuid(req.query.hotel_id, "hotel_id", errors, {
    required: true,
  });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const payload = await crmGuestService.listGuests({
    hotelId,
    q: trimOrNull(req.query.q),
    limit: req.query.limit,
    offset: req.query.offset,
  });
  return sendSuccess(res, 200, payload);
});

const getGuestProfile = asyncHandler(async (req, res) => {
  const errors = [];
  const hotelId = parseUuid(req.query.hotel_id, "hotel_id", errors, {
    required: true,
  });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const payload = await crmGuestService.getGuestProfile({
    hotelId,
    key: req.query.key,
  });
  return sendSuccess(res, 200, payload);
});

module.exports = {
  listGuests,
  getGuestProfile,
};
