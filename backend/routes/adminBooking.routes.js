const express = require("express");
const adminBookingController = require("../controllers/adminBooking.controller");
const validate = require("../middleware/validate.middleware");
const { requireAdminAuth } = require("../middleware/adminAuth.middleware");
const {
  adminCreateBookingSchema,
  assignRoomSchema,
  cancelBookingSchema,
  updateBookingSchema,
  updateBookingStatusSchema,
} = require("../validators/booking.validator");
const adminBookingPaymentController = require("../controllers/adminBookingPayment.controller");
const adminBookingInvoiceController = require("../controllers/adminBookingInvoice.controller");
const {
  recordLedgerEntrySchema,
  voidLedgerEntrySchema,
  createDraftInvoiceSchema,
  refreshDraftInvoiceSchema,
  issueInvoiceSchema,
  voidInvoiceSchema,
} = require("../validators/bookingFinance.validator");

const router = express.Router();

router.use(requireAdminAuth);

router.get("/", adminBookingController.listBookings);
router.get("/stats", adminBookingController.getBookingStats);
router.post(
  "/",
  validate(adminCreateBookingSchema),
  adminBookingController.createBooking
);
// Static paths must be registered before /:id.
router.get("/:id", adminBookingController.getBookingById);
router.post(
  "/:id/cancel",
  validate(cancelBookingSchema),
  adminBookingController.cancelBooking
);
router.patch(
  "/:id/status",
  validate(updateBookingStatusSchema),
  adminBookingController.updateBookingStatus
);
router.patch(
  "/:id/assign-room",
  validate(assignRoomSchema),
  adminBookingController.assignRoom
);
router.patch(
  "/:id",
  validate(updateBookingSchema),
  adminBookingController.updateBooking
);
router.get("/:id/payments", adminBookingPaymentController.listPayments);
router.post(
  "/:id/payments",
  validate(recordLedgerEntrySchema),
  adminBookingPaymentController.recordPayment
);
router.post(
  "/:id/payments/:paymentId/void",
  validate(voidLedgerEntrySchema),
  adminBookingPaymentController.voidPayment
);
router.get("/:id/invoices", adminBookingInvoiceController.listInvoices);
router.post(
  "/:id/invoices",
  validate(createDraftInvoiceSchema),
  adminBookingInvoiceController.createDraftInvoice
);
router.get("/:id/invoices/:invoiceId", adminBookingInvoiceController.getInvoice);
router.patch(
  "/:id/invoices/:invoiceId",
  validate(refreshDraftInvoiceSchema),
  adminBookingInvoiceController.refreshDraftInvoice
);
router.post(
  "/:id/invoices/:invoiceId/issue",
  validate(issueInvoiceSchema),
  adminBookingInvoiceController.issueInvoice
);
router.post(
  "/:id/invoices/:invoiceId/void",
  validate(voidInvoiceSchema),
  adminBookingInvoiceController.voidInvoice
);

module.exports = router;
