const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const bookingInvoiceService = require("../services/bookingInvoice.service");
const { parseUuid } = require("../validators/booking.validator");
const {
  parseBookingIdParam,
  parseHotelIdQuery,
  parseInvoiceIdParam,
  parseInvoiceOverrides,
  parseRequiredString,
} = require("../validators/bookingFinance.validator");

const listInvoices = asyncHandler(async (req, res) => {
  const errors = [];
  const hotelId = parseHotelIdQuery(req, errors);
  const bookingId = parseBookingIdParam(req, errors);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const payload = await bookingInvoiceService.listInvoices({ hotelId, bookingId });
  return sendSuccess(res, 200, payload);
});

const getInvoice = asyncHandler(async (req, res) => {
  const errors = [];
  const hotelId = parseHotelIdQuery(req, errors);
  const bookingId = parseBookingIdParam(req, errors);
  const invoiceId = parseInvoiceIdParam(req, errors);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const payload = await bookingInvoiceService.getInvoice({
    hotelId,
    bookingId,
    invoiceId,
  });
  return sendSuccess(res, 200, payload);
});

const createDraftInvoice = asyncHandler(async (req, res) => {
  const errors = [];
  const hotelId = parseHotelIdQuery(req, errors);
  const bookingId = parseBookingIdParam(req, errors);
  const overrides = parseInvoiceOverrides(req.body || {}, errors);
  const replacesInvoiceId = parseUuid(
    req.body?.replaces_invoice_id,
    "replaces_invoice_id",
    errors,
    { required: false }
  );
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const payload = await bookingInvoiceService.createDraftInvoice({
    hotelId,
    bookingId,
    adminId: req.admin?.id || null,
    replacesInvoiceId,
    overrides,
  });
  return sendSuccess(res, 201, payload);
});

const refreshDraftInvoice = asyncHandler(async (req, res) => {
  const errors = [];
  const hotelId = parseHotelIdQuery(req, errors);
  const bookingId = parseBookingIdParam(req, errors);
  const invoiceId = parseInvoiceIdParam(req, errors);
  const overrides = parseInvoiceOverrides(req.body || {}, errors);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const payload = await bookingInvoiceService.refreshDraftInvoice({
    hotelId,
    bookingId,
    invoiceId,
    overrides,
  });
  return sendSuccess(res, 200, payload);
});

const issueInvoice = asyncHandler(async (req, res) => {
  const errors = [];
  const hotelId = parseHotelIdQuery(req, errors);
  const bookingId = parseBookingIdParam(req, errors);
  const invoiceId = parseInvoiceIdParam(req, errors);
  const overrides = parseInvoiceOverrides(req.body || {}, errors, {
    allowAmountOverrides: false,
  });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const payload = await bookingInvoiceService.issueInvoice({
    hotelId,
    bookingId,
    invoiceId,
    adminId: req.admin?.id || null,
    overrides,
  });
  return sendSuccess(res, payload.idempotent ? 200 : 200, payload);
});

const voidInvoice = asyncHandler(async (req, res) => {
  const errors = [];
  const hotelId = parseHotelIdQuery(req, errors);
  const bookingId = parseBookingIdParam(req, errors);
  const invoiceId = parseInvoiceIdParam(req, errors);
  const voidReason = parseRequiredString(req.body?.void_reason, "void_reason", errors, {
    maxLength: 2000,
  });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  const payload = await bookingInvoiceService.voidInvoice({
    hotelId,
    bookingId,
    invoiceId,
    voidReason,
    adminId: req.admin?.id || null,
  });
  return sendSuccess(res, 200, payload);
});

module.exports = {
  listInvoices,
  getInvoice,
  createDraftInvoice,
  refreshDraftInvoice,
  issueInvoice,
  voidInvoice,
};
