const express = require("express");
const inventoryController = require("../controllers/inventory.controller");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");

const router = express.Router();

router.use(requireAdminAuth);

router.get("/calendar", inventoryController.getAdminInventoryCalendar);
router.get("/day", inventoryController.getAdminInventoryDay);
router.get("/overlaps", inventoryController.getAdminInventoryOverlaps);

module.exports = router;
