const express = require("express");
const adminTenantController = require("../controllers/adminTenant.controller");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");
const { resolveAdminTenancy } = require("../middleware/adminTenancy.middleware");

const router = express.Router();

router.use(requireAdminAuth);
router.use(resolveAdminTenancy);

router.get("/", adminTenantController.getTenant);

module.exports = router;
