const express = require("express");
const bookingController = require("../controllers/booking.controller");
const inventoryController = require("../controllers/inventory.controller");
const validate = require("../middleware/validate.middleware");
const {
  createBookingSchema,
  lookupBookingSchema,
  availabilityQuerySchema,
  cancelPublicBookingSchema,
  updatePublicNotificationPreferencesSchema,
  modifyPublicBookingSchema,
} = require("../validators/booking.validator");

const router = express.Router();

// Static paths must be registered before /:bookingNumber.
router.get(
  "/availability/calendar",
  inventoryController.getPublicInventoryCalendar
);
router.get(
  "/availability",
  validate(availabilityQuerySchema),
  bookingController.getAvailability
);
router.post("/", validate(createBookingSchema), bookingController.createBooking);
router.post(
  "/:bookingNumber/modify/preview",
  validate(modifyPublicBookingSchema),
  bookingController.previewModifyBookingByNumber
);
router.post(
  "/:bookingNumber/modify",
  validate(modifyPublicBookingSchema),
  bookingController.modifyBookingByNumber
);
router.post(
  "/:bookingNumber/notification-preferences",
  validate(updatePublicNotificationPreferencesSchema),
  bookingController.updateNotificationPreferencesByNumber
);
router.post(
  "/:bookingNumber/cancel",
  validate(cancelPublicBookingSchema),
  bookingController.cancelBookingByNumber
);
router.get(
  "/:bookingNumber",
  validate(lookupBookingSchema),
  bookingController.getBookingByNumber
);

module.exports = router;
