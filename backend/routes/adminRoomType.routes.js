const express = require("express");
const adminRoomTypeController = require("../controllers/adminRoomType.controller");
const validate = require("../middleware/validate.middleware");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");
const { resolveAdminTenancy } = require("../middleware/adminTenancy.middleware");
const {
  createRoomTypeSchema,
  updateRoomTypeSchema,
} = require("../validators/adminRoomType.validator");

const router = express.Router();

router.use(requireAdminAuth);
router.use(resolveAdminTenancy);

router.get("/", adminRoomTypeController.listRoomTypes);
router.post(
  "/",
  validate(createRoomTypeSchema),
  adminRoomTypeController.createRoomType
);
router.get("/:id", adminRoomTypeController.getRoomTypeById);
router.patch(
  "/:id",
  validate(updateRoomTypeSchema),
  adminRoomTypeController.updateRoomType
);
router.delete("/:id", adminRoomTypeController.deleteRoomType);

module.exports = router;
