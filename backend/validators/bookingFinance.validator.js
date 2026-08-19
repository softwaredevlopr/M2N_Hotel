const {
  PAYMENT_ENTRY_TYPES,
  PAYMENT_METHODS,
} = require("../utils/bookingFinanceConstants");
const { parseAmount, parseUuid, trimOrNull } = require("./booking.validator");

const MAX_NOTES_LENGTH = 2000;
const MAX_REFERENCE_LENGTH = 120;
const MAX_VOID_REASON_LENGTH = 2000;
const MAX_IDEMPOTENCY_LENGTH = 64;

function parsePositiveAmount(value, field, errors) {
  if (value === undefined || value === null || value === "") {
    errors.push(`${field} is required`);
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    errors.push(`${field} must be a number greater than 0`);
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

function parseOptionalString(value, field, errors, { maxLength } = {}) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    errors.push(`${field} must be a string`);
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (maxLength && trimmed.length > maxLength) {
    errors.push(`${field} must be at most ${maxLength} characters`);
    return null;
  }
  return trimmed;
}

function parseRequiredString(value, field, errors, { maxLength } = {}) {
  const parsed = parseOptionalString(value, field, errors, { maxLength });
  if (!parsed) {
    if (!errors.some((item) => item.startsWith(field))) {
      errors.push(`${field} is required`);
    }
  }
  return parsed;
}

function parseInvoiceOverrides(body, errors, { allowAmountOverrides = true } = {}) {
  const overrides = {};

  if (body.buyer_name !== undefined) {
    overrides.buyer_name = parseOptionalString(body.buyer_name, "buyer_name", errors, {
      maxLength: 150,
    });
  }
  if (body.buyer_email !== undefined) {
    overrides.buyer_email = parseOptionalString(body.buyer_email, "buyer_email", errors, {
      maxLength: 255,
    });
  }
  if (body.buyer_phone !== undefined) {
    overrides.buyer_phone = parseOptionalString(body.buyer_phone, "buyer_phone", errors, {
      maxLength: 50,
    });
  }
  if (body.buyer_gstin !== undefined) {
    overrides.buyer_gstin = parseOptionalString(body.buyer_gstin, "buyer_gstin", errors, {
      maxLength: 15,
    });
  }
  if (body.seller_gstin !== undefined) {
    overrides.seller_gstin = parseOptionalString(body.seller_gstin, "seller_gstin", errors, {
      maxLength: 15,
    });
  }
  if (body.seller_pan !== undefined) {
    overrides.seller_pan = parseOptionalString(body.seller_pan, "seller_pan", errors, {
      maxLength: 10,
    });
  }
  if (body.hsn_sac !== undefined) {
    overrides.hsn_sac = parseOptionalString(body.hsn_sac, "hsn_sac", errors, {
      maxLength: 20,
    });
  }
  if (body.place_of_supply !== undefined) {
    overrides.place_of_supply = parseOptionalString(
      body.place_of_supply,
      "place_of_supply",
      errors,
      { maxLength: 120 }
    );
  }
  if (body.tax_rate_label !== undefined) {
    overrides.tax_rate_label = parseOptionalString(
      body.tax_rate_label,
      "tax_rate_label",
      errors,
      { maxLength: 120 }
    );
  }
  if (body.line_description !== undefined) {
    overrides.line_description = parseOptionalString(
      body.line_description,
      "line_description",
      errors,
      { maxLength: 2000 }
    );
  }
  if (body.notes !== undefined) {
    overrides.notes = parseOptionalString(body.notes, "notes", errors, {
      maxLength: MAX_NOTES_LENGTH,
    });
  }

  if (allowAmountOverrides) {
    if (body.subtotal !== undefined) {
      overrides.subtotal = parseAmount(body.subtotal, "subtotal", errors);
    }
    if (body.tax_amount !== undefined) {
      overrides.tax_amount = parseAmount(body.tax_amount, "tax_amount", errors);
    }
    if (body.tax_rate_percent !== undefined) {
      const parsed = Number(body.tax_rate_percent);
      if (!Number.isFinite(parsed) || parsed < 0) {
        errors.push("tax_rate_percent must be a number >= 0");
      } else {
        overrides.tax_rate_percent = Math.round(parsed * 100) / 100;
      }
    }
  }

  return overrides;
}

const recordLedgerEntrySchema = {
  body: {
    entry_type: { required: true, type: "string", enum: PAYMENT_ENTRY_TYPES },
    payment_method: { required: true, type: "string", enum: PAYMENT_METHODS },
    amount: { required: true, type: "number" },
    currency: { type: "string", maxLength: 3 },
    reference_code: { type: "string", maxLength: MAX_REFERENCE_LENGTH },
    notes: { type: "string", maxLength: MAX_NOTES_LENGTH },
    idempotency_key: { type: "string", maxLength: MAX_IDEMPOTENCY_LENGTH },
    recorded_at: { type: "string" },
    external_provider: { type: "string", maxLength: 30 },
    external_transaction_id: { type: "string", maxLength: 120 },
  },
};

const voidLedgerEntrySchema = {
  body: {
    void_reason: { required: true, type: "string", minLength: 1, maxLength: MAX_VOID_REASON_LENGTH },
  },
};

const createDraftInvoiceSchema = {
  body: {
    replaces_invoice_id: { type: "string" },
    buyer_name: { type: "string", maxLength: 150 },
    buyer_email: { type: "string", maxLength: 255 },
    buyer_phone: { type: "string", maxLength: 50 },
    buyer_gstin: { type: "string", maxLength: 15 },
    seller_gstin: { type: "string", maxLength: 15 },
    seller_pan: { type: "string", maxLength: 10 },
    hsn_sac: { type: "string", maxLength: 20 },
    place_of_supply: { type: "string", maxLength: 120 },
    tax_rate_label: { type: "string", maxLength: 120 },
    line_description: { type: "string", maxLength: 2000 },
    notes: { type: "string", maxLength: MAX_NOTES_LENGTH },
  },
};

const refreshDraftInvoiceSchema = createDraftInvoiceSchema;

const issueInvoiceSchema = {
  body: {
    buyer_gstin: { type: "string", maxLength: 15 },
    notes: { type: "string", maxLength: MAX_NOTES_LENGTH },
    hsn_sac: { type: "string", maxLength: 20 },
    place_of_supply: { type: "string", maxLength: 120 },
  },
};

const voidInvoiceSchema = {
  body: {
    void_reason: { required: true, type: "string", minLength: 1, maxLength: MAX_VOID_REASON_LENGTH },
  },
};

function parseHotelIdQuery(req, errors) {
  return parseUuid(req.query.hotel_id, "hotel_id", errors, { required: true });
}

function parseBookingIdParam(req, errors) {
  return parseUuid(req.params.id, "id", errors, { required: true });
}

function parsePaymentIdParam(req, errors) {
  return parseUuid(req.params.paymentId, "paymentId", errors, { required: true });
}

function parseInvoiceIdParam(req, errors) {
  return parseUuid(req.params.invoiceId, "invoiceId", errors, { required: true });
}

function parseRecordLedgerBody(body, errors) {
  const entryType = trimOrNull(body.entry_type);
  if (!entryType || !PAYMENT_ENTRY_TYPES.includes(entryType)) {
    errors.push(`entry_type must be one of: ${PAYMENT_ENTRY_TYPES.join(", ")}`);
  }

  const paymentMethod = trimOrNull(body.payment_method);
  if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
    errors.push(`payment_method must be one of: ${PAYMENT_METHODS.join(", ")}`);
  }

  const amount = parsePositiveAmount(body.amount, "amount", errors);
  const currency = parseOptionalString(body.currency, "currency", errors, {
    maxLength: 3,
  });
  const referenceCode = parseOptionalString(body.reference_code, "reference_code", errors, {
    maxLength: MAX_REFERENCE_LENGTH,
  });
  const notes = parseOptionalString(body.notes, "notes", errors, {
    maxLength: MAX_NOTES_LENGTH,
  });
  const idempotencyKey = parseOptionalString(
    body.idempotency_key,
    "idempotency_key",
    errors,
    { maxLength: MAX_IDEMPOTENCY_LENGTH }
  );
  const externalProvider = parseOptionalString(
    body.external_provider,
    "external_provider",
    errors,
    { maxLength: 30 }
  );
  const externalTransactionId = parseOptionalString(
    body.external_transaction_id,
    "external_transaction_id",
    errors,
    { maxLength: 120 }
  );

  let recordedAt = null;
  if (body.recorded_at !== undefined && body.recorded_at !== null && body.recorded_at !== "") {
    const parsed = new Date(body.recorded_at);
    if (Number.isNaN(parsed.getTime())) {
      errors.push("recorded_at must be a valid ISO timestamp");
    } else {
      recordedAt = parsed.toISOString();
    }
  }

  return {
    entryType,
    paymentMethod,
    amount,
    currency,
    referenceCode,
    notes,
    idempotencyKey,
    externalProvider,
    externalTransactionId,
    recordedAt,
  };
}

module.exports = {
  recordLedgerEntrySchema,
  voidLedgerEntrySchema,
  createDraftInvoiceSchema,
  refreshDraftInvoiceSchema,
  issueInvoiceSchema,
  voidInvoiceSchema,
  parseHotelIdQuery,
  parseBookingIdParam,
  parsePaymentIdParam,
  parseInvoiceIdParam,
  parseRecordLedgerBody,
  parseInvoiceOverrides,
  parseRequiredString,
};
