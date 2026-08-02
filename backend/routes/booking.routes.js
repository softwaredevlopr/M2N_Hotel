const express = require("express");
const bookingController = require("../controllers/booking.controller");
const validate = require("../middleware/validate.middleware");
const {
  createBookingSchema,
  lookupBookingSchema,
} = require("../validators/booking.validator");

const router = express.Router();

router.post("/", validate(createBookingSchema), bookingController.createBooking);
router.get(
  "/:bookingNumber",
  validate(lookupBookingSchema),
  bookingController.getBookingByNumber
);

module.exports = router;
