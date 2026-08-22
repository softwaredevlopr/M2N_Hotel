const express = require("express");
const inventoryController = require("../controllers/inventory.controller");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");
const { resolveAdminTenancy } = require("../middleware/adminTenancy.middleware");

const router = express.Router();

router.use(requireAdminAuth);
router.use(resolveAdminTenancy);

router.get("/calendar", inventoryController.getAdminInventoryCalendar);
router.get("/day", inventoryController.getAdminInventoryDay);
router.get("/overlaps", inventoryController.getAdminInventoryOverlaps);

router.put("/dates", inventoryController.upsertAdminInventoryDate);
router.delete("/dates", inventoryController.deleteAdminInventoryDate);

module.exports = router;
