const express = require("express");
const validate = require("../middleware/validate.middleware");
const { onboardingSchema } = require("../validators/adminOnboarding.validator");
const adminOnboardingController = require("../controllers/adminOnboarding.controller");

const router = express.Router();

// Public self-serve onboarding — no requireAdminAuth.
router.post("/", validate(onboardingSchema), adminOnboardingController.onboard);

module.exports = router;
