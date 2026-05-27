const express = require("express");
const inquiryController = require("../controllers/inquiry.controller");
const validate = require("../middleware/validate.middleware");
const {
  createInquirySchema,
  updateInquiryStatusSchema,
} = require("../validators/inquiry.validator");

const router = express.Router();

router.post("/", validate(createInquirySchema), inquiryController.createInquiry);
router.get("/", inquiryController.listInquiries);
router.get("/:id", inquiryController.getInquiryById);
router.patch(
  "/:id/status",
  validate(updateInquiryStatusSchema),
  inquiryController.updateInquiryStatus
);

module.exports = router;
