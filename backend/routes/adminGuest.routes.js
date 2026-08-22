const express = require("express");
const adminGuestController = require("../controllers/adminGuest.controller");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");
const { resolveAdminTenancy } = require("../middleware/adminTenancy.middleware");

const router = express.Router();

router.use(requireAdminAuth);
router.use(resolveAdminTenancy);

router.get("/", adminGuestController.listGuests);
router.get("/profile", adminGuestController.getGuestProfile);

module.exports = router;
