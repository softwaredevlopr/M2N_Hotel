const express = require("express");
const adminRoomController = require("../controllers/adminRoom.controller");
const validate = require("../middleware/validate.middleware");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");
const { resolveAdminTenancy } = require("../middleware/adminTenancy.middleware");
const {
  createRoomSchema,
  updateRoomSchema,
} = require("../validators/adminRoom.validator");

const router = express.Router();

router.use(requireAdminAuth);
router.use(resolveAdminTenancy);

router.get("/", adminRoomController.listRooms);
router.post("/", validate(createRoomSchema), adminRoomController.createRoom);
router.get("/:id", adminRoomController.getRoomById);
router.patch(
  "/:id",
  validate(updateRoomSchema),
  adminRoomController.updateRoom
);
router.delete("/:id", adminRoomController.deleteRoom);

module.exports = router;
