const express = require("express");
const bookingController = require("../controllers/booking.controller");
const inventoryController = require("../controllers/inventory.controller");
const validate = require("../middleware/validate.middleware");
const {
  createBookingSchema,
  lookupBookingSchema,
  availabilityQuerySchema,
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
router.get(
  "/:bookingNumber",
  validate(lookupBookingSchema),
  bookingController.getBookingByNumber
);

module.exports = router;
