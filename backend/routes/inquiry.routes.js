const express = require("express");
const inquiryController = require("../controllers/inquiry.controller");
const validate = require("../middleware/validate.middleware");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");
const {
  createInquirySchema,
  updateInquiryStatusSchema,
} = require("../validators/inquiry.validator");

const router = express.Router();

// Public: guest booking inquiry form.
router.post("/", validate(createInquirySchema), inquiryController.createInquiry);

// Admin-only reads/writes (guest PII). JWT required.
router.get("/", requireAdminAuth, inquiryController.listInquiries);
router.get("/:id", requireAdminAuth, inquiryController.getInquiryById);
router.patch(
  "/:id/status",
  requireAdminAuth,
  validate(updateInquiryStatusSchema),
  inquiryController.updateInquiryStatus
);
router.delete("/:id", requireAdminAuth, inquiryController.deleteInquiry);

module.exports = router;
