const express = require("express");
const adminTariffController = require("../controllers/adminTariff.controller");
const validate = require("../middleware/validate.middleware");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");
const {
  createTariffSchema,
  updateTariffSchema,
  updateTariffSettingsSchema,
} = require("../validators/adminTariff.validator");

const router = express.Router();

router.use(requireAdminAuth);

router.get("/settings/:hotelId", adminTariffController.getTariffSettings);
router.patch(
  "/settings/:hotelId",
  validate(updateTariffSettingsSchema),
  adminTariffController.updateTariffSettings
);

router.get("/", adminTariffController.listTariffs);
router.post("/", validate(createTariffSchema), adminTariffController.createTariff);
router.get("/:id", adminTariffController.getTariffById);
router.patch(
  "/:id",
  validate(updateTariffSchema),
  adminTariffController.updateTariff
);
router.delete("/:id", adminTariffController.deleteTariff);

module.exports = router;
