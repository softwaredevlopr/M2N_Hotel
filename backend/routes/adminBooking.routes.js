const express = require("express");
const adminBookingController = require("../controllers/adminBooking.controller");
const validate = require("../middleware/validate.middleware");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");
const {
  adminCreateBookingSchema,
  assignRoomSchema,
  cancelBookingSchema,
  updateBookingSchema,
  updateBookingStatusSchema,
} = require("../validators/booking.validator");

const router = express.Router();

router.use(requireAdminAuth);

router.get("/", adminBookingController.listBookings);
router.get("/stats", adminBookingController.getBookingStats);
router.post(
  "/",
  validate(adminCreateBookingSchema),
  adminBookingController.createBooking
);
// Static paths must be registered before /:id.
router.get("/:id", adminBookingController.getBookingById);
router.post(
  "/:id/cancel",
  validate(cancelBookingSchema),
  adminBookingController.cancelBooking
);
router.patch(
  "/:id/status",
  validate(updateBookingStatusSchema),
  adminBookingController.updateBookingStatus
);
router.patch(
  "/:id/assign-room",
  validate(assignRoomSchema),
  adminBookingController.assignRoom
);
router.patch(
  "/:id",
  validate(updateBookingSchema),
  adminBookingController.updateBooking
);

module.exports = router;
