const express = require("express");
const inquiryController = require("../controllers/inquiry.controller");
const validate = require("../middleware/validate.middleware");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");
const { resolveAdminTenancy } = require("../middleware/adminTenancy.middleware");
const {
  createInquirySchema,
  updateInquiryStatusSchema,
} = require("../validators/inquiry.validator");

const router = express.Router();

// Public: guest booking inquiry form.
router.post("/", validate(createInquirySchema), inquiryController.createInquiry);

// Admin-only reads/writes (guest PII). JWT required.
router.get("/", requireAdminAuth, resolveAdminTenancy, inquiryController.listInquiries);
router.get("/:id", requireAdminAuth, resolveAdminTenancy, inquiryController.getInquiryById);
router.patch(
  "/:id/status",
  requireAdminAuth,
  resolveAdminTenancy,
  validate(updateInquiryStatusSchema),
  inquiryController.updateInquiryStatus
);
router.delete("/:id", requireAdminAuth, resolveAdminTenancy, inquiryController.deleteInquiry);

module.exports = router;
