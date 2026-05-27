const express = require("express");
const rootController = require("../controllers/root.controller");
const healthController = require("../controllers/health.controller");

const router = express.Router();

router.get("/", rootController.getRoot);
router.get("/health", healthController.getHealth);

module.exports = router;
