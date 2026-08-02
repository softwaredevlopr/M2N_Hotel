const express = require("express");
const adminHotelController = require("../controllers/adminHotel.controller");
const validate = require("../middleware/validate.middleware");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");
const {
  createHotelSchema,
  updateHotelSchema,
} = require("../validators/adminHotel.validator");

const router = express.Router();

router.use(requireAdminAuth);

router.get("/", adminHotelController.listHotels);
router.post("/", validate(createHotelSchema), adminHotelController.createHotel);
router.get("/:id", adminHotelController.getHotelById);
router.patch(
  "/:id",
  validate(updateHotelSchema),
  adminHotelController.updateHotel
);
router.delete("/:id", adminHotelController.deleteHotel);

module.exports = router;
