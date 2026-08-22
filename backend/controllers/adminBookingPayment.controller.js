const { sendSuccess, sendValidationError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const bookingPaymentService = require("../services/bookingPayment.service");
const { assertHotelAccess } = require("../utils/adminTenancy");
const {
  parseBookingIdParam,
  parseHotelIdQuery,
  parsePaymentIdParam,
  parseRecordLedgerBody,
  parseRequiredString,
} = require("../validators/bookingFinance.validator");

const listPayments = asyncHandler(async (req, res) => {
  const errors = [];
  const hotelId = parseHotelIdQuery(req, errors);
  const bookingId = parseBookingIdParam(req, errors);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  assertHotelAccess(req.tenancy, hotelId, { notFoundMessage: "Booking not found" });

  const payload = await bookingPaymentService.listPayments({ hotelId, bookingId });
  return sendSuccess(res, 200, payload);
});

const recordPayment = asyncHandler(async (req, res) => {
  const errors = [];
  const hotelId = parseHotelIdQuery(req, errors);
  const bookingId = parseBookingIdParam(req, errors);
  const body = parseRecordLedgerBody(req.body || {}, errors);
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  assertHotelAccess(req.tenancy, hotelId, { notFoundMessage: "Booking not found" });

  const payload = await bookingPaymentService.recordLedgerEntry({
    hotelId,
    bookingId,
    entryType: body.entryType,
    paymentMethod: body.paymentMethod,
    amount: body.amount,
    currency: body.currency,
    recordedAt: body.recordedAt,
    referenceCode: body.referenceCode,
    notes: body.notes,
    idempotencyKey: body.idempotencyKey,
    externalProvider: body.externalProvider,
    externalTransactionId: body.externalTransactionId,
    adminId: req.admin?.id || null,
  });

  return sendSuccess(res, payload.idempotent ? 200 : 201, payload);
});

const voidPayment = asyncHandler(async (req, res) => {
  const errors = [];
  const hotelId = parseHotelIdQuery(req, errors);
  const bookingId = parseBookingIdParam(req, errors);
  const paymentId = parsePaymentIdParam(req, errors);
  const voidReason = parseRequiredString(req.body?.void_reason, "void_reason", errors, {
    maxLength: 2000,
  });
  if (errors.length > 0) {
    return sendValidationError(res, errors);
  }

  assertHotelAccess(req.tenancy, hotelId, { notFoundMessage: "Booking not found" });

  const payload = await bookingPaymentService.voidPaymentEntry({
    hotelId,
    bookingId,
    paymentId,
    voidReason,
    adminId: req.admin?.id || null,
  });
  return sendSuccess(res, 200, payload);
});

module.exports = {
  listPayments,
  recordPayment,
  voidPayment,
};
