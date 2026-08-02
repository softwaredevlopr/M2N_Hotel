const express = require("express");
const adminAuthController = require("../controllers/adminAuth.controller");
const validate = require("../middleware/validate.middleware");
const { loginSchema } = require("../validators/adminAuth.validator");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");

const router = express.Router();

router.post("/login", validate(loginSchema), adminAuthController.login);
router.get("/me", requireAdminAuth, adminAuthController.me);

module.exports = router;
