const { pool } = require("../config/db");
const { AppError } = require("../middleware/error.middleware");
const { nightsBetween } = require("../validators/booking.validator");
const {
  deriveHotelInvoiceCode,
  draftInvoicePlaceholder,
  formatInvoiceNumber,
} = require("../utils/invoiceNumber");
const { GSTIN_REGEX, PAN_REGEX } = require("../utils/bookingFinanceConstants");
const {
  lockBookingForFinance,
  mapInvoiceRow,
  roundMoney,
  syncBookingPaymentStatus,
} = require("./bookingFinanceShared");

const INVOICE_SELECT = `
  id, hotel_id, booking_id, invoice_number, status, replaces_invoice_id,
  issued_at, voided_at, void_reason,
  subtotal, tax_amount, total_amount, currency, tax_rate_label, tax_rate_percent,
  seller_name, seller_email, seller_phone,
  seller_address_line1, seller_address_line2, seller_city, seller_state,
  seller_country, seller_postal_code, seller_gstin, seller_pan,
  buyer_name, buyer_email, buyer_phone, buyer_gstin,
  booking_number,
  to_char(check_in_date, 'YYYY-MM-DD') AS check_in_date,
  to_char(check_out_date, 'YYYY-MM-DD') AS check_out_date,
  nights, room_type_name, number_of_rooms, adults, children,
  line_description, hsn_sac, place_of_supply, notes,
  created_by_admin_id, created_at, updated_at
`;

function normalizeGstin(value) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).trim().toUpperCase();
  if (!GSTIN_REGEX.test(normalized)) {
    throw new AppError("buyer_gstin must be a valid 15-character GSTIN", 400);
  }
  return normalized;
}

function normalizePan(value) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).trim().toUpperCase();
  if (!PAN_REGEX.test(normalized)) {
    throw new AppError("seller_pan must be a valid PAN", 400);
  }
  return normalized;
}

function parseTaxRatePercent(label) {
  if (!label || typeof label !== "string") return null;
  const match = label.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  return roundMoney(match[1]);
}

function buildLineDescription({ roomTypeName, nights, numberOfRooms }) {
  const roomLabel = numberOfRooms === 1 ? "room" : "rooms";
  const nightLabel = nights === 1 ? "night" : "nights";
  return `${roomTypeName} × ${nights} ${nightLabel} × ${numberOfRooms} ${roomLabel}`;
}

function readBillingMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }
  const billing =
    metadata.billing && typeof metadata.billing === "object"
      ? metadata.billing
      : {};
  return {
    gstin:
      typeof billing.gstin === "string" ? billing.gstin.trim().toUpperCase() : null,
    pan: typeof billing.pan === "string" ? billing.pan.trim().toUpperCase() : null,
    hsn_sac:
      typeof billing.hsn_sac === "string" ? billing.hsn_sac.trim() : null,
    place_of_supply:
      typeof billing.place_of_supply === "string"
        ? billing.place_of_supply.trim()
        : null,
  };
}

async function loadBookingContext(client, bookingId, hotelId) {
  const result = await client.query(
    `SELECT
       b.id, b.hotel_id, b.booking_number, b.guest_name, b.guest_email, b.guest_phone,
       to_char(b.check_in_date, 'YYYY-MM-DD') AS check_in_date,
       to_char(b.check_out_date, 'YYYY-MM-DD') AS check_out_date,
       b.adults, b.children, b.number_of_rooms,
       b.subtotal, b.tax_amount, b.total_amount, b.currency,
       h.slug, h.name, h.email, h.phone, h.address_line1, h.address_line2,
       h.city, h.state, h.country, h.postal_code, h.metadata,
       rt.name AS room_type_name
     FROM bookings b
     INNER JOIN hotels h ON h.id = b.hotel_id
     INNER JOIN room_types rt ON rt.id = b.room_type_id
     WHERE b.id = $1 AND b.hotel_id = $2
     LIMIT 1`,
    [bookingId, hotelId]
  );
  if (result.rows.length === 0) {
    throw new AppError(`Booking not found: ${bookingId}`, 404);
  }
  return result.rows[0];
}

function buildSnapshot(context, overrides = {}) {
  const checkIn = String(context.check_in_date).slice(0, 10);
  const checkOut = String(context.check_out_date).slice(0, 10);
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) {
    throw new AppError("Booking stay dates are invalid for invoice snapshot", 400);
  }

  const billing = readBillingMetadata(context.metadata);
  const tariffSettings =
    context.metadata &&
    typeof context.metadata === "object" &&
    context.metadata.tariff_settings &&
    typeof context.metadata.tariff_settings === "object"
      ? context.metadata.tariff_settings
      : {};

  const taxRateLabel =
    overrides.tax_rate_label !== undefined
      ? overrides.tax_rate_label
      : typeof tariffSettings.gst === "string"
        ? tariffSettings.gst.trim()
        : null;

  const subtotal = roundMoney(
    overrides.subtotal !== undefined ? overrides.subtotal : context.subtotal
  );
  const taxAmount = roundMoney(
    overrides.tax_amount !== undefined ? overrides.tax_amount : context.tax_amount
  );
  const totalAmount = roundMoney(subtotal + taxAmount);

  const sellerGstin =
    overrides.seller_gstin !== undefined
      ? overrides.seller_gstin
      : billing.gstin;
  const sellerPan =
    overrides.seller_pan !== undefined ? overrides.seller_pan : billing.pan;

  if (sellerGstin) {
    const gstin = String(sellerGstin).trim().toUpperCase();
    if (!GSTIN_REGEX.test(gstin)) {
      throw new AppError("seller_gstin must be a valid 15-character GSTIN", 400);
    }
  }
  if (sellerPan) {
    normalizePan(sellerPan);
  }

  const buyerGstin =
    overrides.buyer_gstin !== undefined
      ? overrides.buyer_gstin
      : null;
  if (buyerGstin) {
    normalizeGstin(buyerGstin);
  }

  const roomTypeName = context.room_type_name;
  const numberOfRooms = context.number_of_rooms;
  const lineDescription =
    overrides.line_description ||
    buildLineDescription({
      roomTypeName,
      nights,
      numberOfRooms,
    });

  return {
    subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    currency: String(context.currency || "INR").trim().toUpperCase(),
    tax_rate_label: taxRateLabel || null,
    tax_rate_percent:
      overrides.tax_rate_percent !== undefined
        ? overrides.tax_rate_percent
        : parseTaxRatePercent(taxRateLabel),
    seller_name: context.name,
    seller_email: context.email,
    seller_phone: context.phone,
    seller_address_line1: context.address_line1,
    seller_address_line2: context.address_line2,
    seller_city: context.city,
    seller_state: context.state,
    seller_country: context.country || "India",
    seller_postal_code: context.postal_code,
    seller_gstin: sellerGstin ? String(sellerGstin).trim().toUpperCase() : null,
    seller_pan: sellerPan ? String(sellerPan).trim().toUpperCase() : null,
    buyer_name: overrides.buyer_name || context.guest_name,
    buyer_email: overrides.buyer_email || context.guest_email,
    buyer_phone: overrides.buyer_phone || context.guest_phone,
    buyer_gstin: buyerGstin ? String(buyerGstin).trim().toUpperCase() : null,
    booking_number: context.booking_number,
    check_in_date: checkIn,
    check_out_date: checkOut,
    nights,
    room_type_name: roomTypeName,
    number_of_rooms: numberOfRooms,
    adults: context.adults,
    children: context.children,
    line_description: lineDescription,
    hsn_sac:
      overrides.hsn_sac !== undefined ? overrides.hsn_sac : billing.hsn_sac,
    place_of_supply:
      overrides.place_of_supply !== undefined
        ? overrides.place_of_supply
        : billing.place_of_supply || context.state,
    notes: overrides.notes !== undefined ? overrides.notes : null,
  };
}

async function listInvoices({ hotelId, bookingId }) {
  const bookingCheck = await pool.query(
    `SELECT id FROM bookings WHERE id = $1 AND hotel_id = $2 LIMIT 1`,
    [bookingId, hotelId]
  );
  if (bookingCheck.rows.length === 0) {
    throw new AppError(`Booking not found: ${bookingId}`, 404);
  }

  const result = await pool.query(
    `SELECT ${INVOICE_SELECT}
     FROM booking_invoices
     WHERE hotel_id = $1 AND booking_id = $2
     ORDER BY created_at DESC`,
    [hotelId, bookingId]
  );

  return { data: result.rows.map(mapInvoiceRow) };
}

async function getInvoice({ hotelId, bookingId, invoiceId }) {
  const result = await pool.query(
    `SELECT ${INVOICE_SELECT}
     FROM booking_invoices
     WHERE id = $1 AND booking_id = $2 AND hotel_id = $3
     LIMIT 1`,
    [invoiceId, bookingId, hotelId]
  );
  if (result.rows.length === 0) {
    throw new AppError(`Invoice not found: ${invoiceId}`, 404);
  }
  return { data: mapInvoiceRow(result.rows[0]) };
}

async function createDraftInvoice({
  hotelId,
  bookingId,
  adminId,
  replacesInvoiceId,
  overrides = {},
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockBookingForFinance(client, bookingId, hotelId);

    if (replacesInvoiceId) {
      const replaced = await client.query(
        `SELECT id, status, booking_id, hotel_id
         FROM booking_invoices
         WHERE id = $1
         LIMIT 1`,
        [replacesInvoiceId]
      );
      if (replaced.rows.length === 0) {
        throw new AppError(`Replaced invoice not found: ${replacesInvoiceId}`, 404);
      }
      const prior = replaced.rows[0];
      if (prior.booking_id !== bookingId || prior.hotel_id !== hotelId) {
        throw new AppError("replaces_invoice_id does not belong to this booking", 400);
      }
      if (prior.status !== "void") {
        throw new AppError("replaces_invoice_id must reference a void invoice", 400);
      }
    }

    const context = await loadBookingContext(client, bookingId, hotelId);
    const snapshot = buildSnapshot(context, overrides);

    const insert = await client.query(
      `INSERT INTO booking_invoices (
         hotel_id, booking_id, invoice_number, status, replaces_invoice_id,
         subtotal, tax_amount, total_amount, currency, tax_rate_label, tax_rate_percent,
         seller_name, seller_email, seller_phone,
         seller_address_line1, seller_address_line2, seller_city, seller_state,
         seller_country, seller_postal_code, seller_gstin, seller_pan,
         buyer_name, buyer_email, buyer_phone, buyer_gstin,
         booking_number, check_in_date, check_out_date, nights, room_type_name,
         number_of_rooms, adults, children, line_description, hsn_sac,
         place_of_supply, notes, created_by_admin_id
       )
       VALUES (
         $1, $2, $3, 'draft', $4,
         $5, $6, $7, $8, $9, $10,
         $11, $12, $13,
         $14, $15, $16, $17,
         $18, $19, $20, $21,
         $22, $23, $24, $25,
         $26, $27::date, $28::date, $29, $30,
         $31, $32, $33, $34, $35,
         $36, $37, $38
       )
       RETURNING ${INVOICE_SELECT}`,
      [
        hotelId,
        bookingId,
        draftInvoicePlaceholder(),
        replacesInvoiceId || null,
        snapshot.subtotal,
        snapshot.tax_amount,
        snapshot.total_amount,
        snapshot.currency,
        snapshot.tax_rate_label,
        snapshot.tax_rate_percent,
        snapshot.seller_name,
        snapshot.seller_email,
        snapshot.seller_phone,
        snapshot.seller_address_line1,
        snapshot.seller_address_line2,
        snapshot.seller_city,
        snapshot.seller_state,
        snapshot.seller_country,
        snapshot.seller_postal_code,
        snapshot.seller_gstin,
        snapshot.seller_pan,
        snapshot.buyer_name,
        snapshot.buyer_email,
        snapshot.buyer_phone,
        snapshot.buyer_gstin,
        snapshot.booking_number,
        snapshot.check_in_date,
        snapshot.check_out_date,
        snapshot.nights,
        snapshot.room_type_name,
        snapshot.number_of_rooms,
        snapshot.adults,
        snapshot.children,
        snapshot.line_description,
        snapshot.hsn_sac,
        snapshot.place_of_supply,
        snapshot.notes,
        adminId || null,
      ]
    );

    await client.query("COMMIT");
    return { data: mapInvoiceRow(insert.rows[0]) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function refreshDraftInvoice({
  hotelId,
  bookingId,
  invoiceId,
  overrides = {},
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockBookingForFinance(client, bookingId, hotelId);

    const invoiceResult = await client.query(
      `SELECT id, status
       FROM booking_invoices
       WHERE id = $1 AND booking_id = $2 AND hotel_id = $3
       FOR UPDATE`,
      [invoiceId, bookingId, hotelId]
    );
    if (invoiceResult.rows.length === 0) {
      throw new AppError(`Invoice not found: ${invoiceId}`, 404);
    }
    if (invoiceResult.rows[0].status !== "draft") {
      throw new AppError("Only draft invoices can be refreshed", 409);
    }

    const context = await loadBookingContext(client, bookingId, hotelId);
    const snapshot = buildSnapshot(context, overrides);

    const updated = await client.query(
      `UPDATE booking_invoices
       SET subtotal = $2,
           tax_amount = $3,
           total_amount = $4,
           currency = $5,
           tax_rate_label = $6,
           tax_rate_percent = $7,
           seller_name = $8,
           seller_email = $9,
           seller_phone = $10,
           seller_address_line1 = $11,
           seller_address_line2 = $12,
           seller_city = $13,
           seller_state = $14,
           seller_country = $15,
           seller_postal_code = $16,
           seller_gstin = $17,
           seller_pan = $18,
           buyer_name = $19,
           buyer_email = $20,
           buyer_phone = $21,
           buyer_gstin = COALESCE($22, buyer_gstin),
           booking_number = $23,
           check_in_date = $24::date,
           check_out_date = $25::date,
           nights = $26,
           room_type_name = $27,
           number_of_rooms = $28,
           adults = $29,
           children = $30,
           line_description = $31,
           hsn_sac = COALESCE($32, hsn_sac),
           place_of_supply = COALESCE($33, place_of_supply),
           notes = COALESCE($34, notes)
       WHERE id = $1
       RETURNING ${INVOICE_SELECT}`,
      [
        invoiceId,
        snapshot.subtotal,
        snapshot.tax_amount,
        snapshot.total_amount,
        snapshot.currency,
        snapshot.tax_rate_label,
        snapshot.tax_rate_percent,
        snapshot.seller_name,
        snapshot.seller_email,
        snapshot.seller_phone,
        snapshot.seller_address_line1,
        snapshot.seller_address_line2,
        snapshot.seller_city,
        snapshot.seller_state,
        snapshot.seller_country,
        snapshot.seller_postal_code,
        snapshot.seller_gstin,
        snapshot.seller_pan,
        snapshot.buyer_name,
        snapshot.buyer_email,
        snapshot.buyer_phone,
        snapshot.buyer_gstin,
        snapshot.booking_number,
        snapshot.check_in_date,
        snapshot.check_out_date,
        snapshot.nights,
        snapshot.room_type_name,
        snapshot.number_of_rooms,
        snapshot.adults,
        snapshot.children,
        snapshot.line_description,
        snapshot.hsn_sac,
        snapshot.place_of_supply,
        snapshot.notes,
      ]
    );

    await client.query("COMMIT");
    return { data: mapInvoiceRow(updated.rows[0]) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function allocateInvoiceNumber(client, hotelId, issuedAt) {
  const hotelResult = await client.query(
    `SELECT slug, metadata FROM hotels WHERE id = $1 LIMIT 1`,
    [hotelId]
  );
  if (hotelResult.rows.length === 0) {
    throw new AppError("Hotel not found", 404);
  }

  const hotel = hotelResult.rows[0];
  const issuedDate = issuedAt ? new Date(issuedAt) : new Date();
  const year = issuedDate.getUTCFullYear();
  const hotelCode = deriveHotelInvoiceCode(hotel.slug, hotel.metadata);

  const seqResult = await client.query(
    `INSERT INTO hotel_invoice_sequences (hotel_id, year, last_sequence)
     VALUES ($1, $2, 1)
     ON CONFLICT (hotel_id, year)
     DO UPDATE SET last_sequence = hotel_invoice_sequences.last_sequence + 1
     RETURNING last_sequence`,
    [hotelId, year]
  );

  const sequence = seqResult.rows[0].last_sequence;
  return formatInvoiceNumber(hotelCode, year, sequence);
}

async function issueInvoice({
  hotelId,
  bookingId,
  invoiceId,
  adminId: _adminId,
  overrides = {},
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockBookingForFinance(client, bookingId, hotelId);

    const invoiceResult = await client.query(
      `SELECT id, status
       FROM booking_invoices
       WHERE id = $1 AND booking_id = $2 AND hotel_id = $3
       FOR UPDATE`,
      [invoiceId, bookingId, hotelId]
    );
    if (invoiceResult.rows.length === 0) {
      throw new AppError(`Invoice not found: ${invoiceId}`, 404);
    }

    const invoice = invoiceResult.rows[0];
    if (invoice.status === "issued") {
      const existing = await client.query(
        `SELECT ${INVOICE_SELECT}
         FROM booking_invoices
         WHERE id = $1
         LIMIT 1`,
        [invoiceId]
      );
      const sync = await syncBookingPaymentStatus(client, bookingId);
      await client.query("COMMIT");
      return {
        data: mapInvoiceRow(existing.rows[0]),
        payment_status: sync.payment_status,
        net_paid: sync.net_paid,
        billed_total: sync.billed_total,
        idempotent: true,
      };
    }
    if (invoice.status !== "draft") {
      throw new AppError("Only draft invoices can be issued", 409);
    }

    const existingIssued = await client.query(
      `SELECT id FROM booking_invoices
       WHERE booking_id = $1 AND status = 'issued'
       LIMIT 1`,
      [bookingId]
    );
    if (existingIssued.rows.length > 0) {
      throw new AppError(
        "Booking already has an issued invoice; void it before issuing another",
        409
      );
    }

    if (Object.keys(overrides).length > 0) {
      const context = await loadBookingContext(client, bookingId, hotelId);
      const snapshot = buildSnapshot(context, overrides);
      await client.query(
        `UPDATE booking_invoices
         SET subtotal = $2,
             tax_amount = $3,
             total_amount = $4,
             currency = $5,
             tax_rate_label = $6,
             tax_rate_percent = $7,
             seller_name = $8,
             seller_email = $9,
             seller_phone = $10,
             seller_address_line1 = $11,
             seller_address_line2 = $12,
             seller_city = $13,
             seller_state = $14,
             seller_country = $15,
             seller_postal_code = $16,
             seller_gstin = $17,
             seller_pan = $18,
             buyer_name = $19,
             buyer_email = $20,
             buyer_phone = $21,
             buyer_gstin = COALESCE($22, buyer_gstin),
             booking_number = $23,
             check_in_date = $24::date,
             check_out_date = $25::date,
             nights = $26,
             room_type_name = $27,
             number_of_rooms = $28,
             adults = $29,
             children = $30,
             line_description = $31,
             hsn_sac = COALESCE($32, hsn_sac),
             place_of_supply = COALESCE($33, place_of_supply),
             notes = COALESCE($34, notes)
         WHERE id = $1`,
        [
          invoiceId,
          snapshot.subtotal,
          snapshot.tax_amount,
          snapshot.total_amount,
          snapshot.currency,
          snapshot.tax_rate_label,
          snapshot.tax_rate_percent,
          snapshot.seller_name,
          snapshot.seller_email,
          snapshot.seller_phone,
          snapshot.seller_address_line1,
          snapshot.seller_address_line2,
          snapshot.seller_city,
          snapshot.seller_state,
          snapshot.seller_country,
          snapshot.seller_postal_code,
          snapshot.seller_gstin,
          snapshot.seller_pan,
          snapshot.buyer_name,
          snapshot.buyer_email,
          snapshot.buyer_phone,
          snapshot.buyer_gstin,
          snapshot.booking_number,
          snapshot.check_in_date,
          snapshot.check_out_date,
          snapshot.nights,
          snapshot.room_type_name,
          snapshot.number_of_rooms,
          snapshot.adults,
          snapshot.children,
          snapshot.line_description,
          snapshot.hsn_sac,
          snapshot.place_of_supply,
          snapshot.notes,
        ]
      );
    }

    const issuedAt = new Date();
    const invoiceNumber = await allocateInvoiceNumber(client, hotelId, issuedAt);

    const updated = await client.query(
      `UPDATE booking_invoices
       SET status = 'issued',
           invoice_number = $2,
           issued_at = $3
       WHERE id = $1
       RETURNING ${INVOICE_SELECT}`,
      [invoiceId, invoiceNumber, issuedAt]
    );

    const sync = await syncBookingPaymentStatus(client, bookingId);
    await client.query("COMMIT");

    return {
      data: mapInvoiceRow(updated.rows[0]),
      payment_status: sync.payment_status,
      net_paid: sync.net_paid,
      billed_total: sync.billed_total,
      idempotent: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function voidInvoice({
  hotelId,
  bookingId,
  invoiceId,
  voidReason,
  adminId: _adminId,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockBookingForFinance(client, bookingId, hotelId);

    const invoiceResult = await client.query(
      `SELECT id, status
       FROM booking_invoices
       WHERE id = $1 AND booking_id = $2 AND hotel_id = $3
       FOR UPDATE`,
      [invoiceId, bookingId, hotelId]
    );
    if (invoiceResult.rows.length === 0) {
      throw new AppError(`Invoice not found: ${invoiceId}`, 404);
    }

    const invoice = invoiceResult.rows[0];
    if (invoice.status === "void") {
      throw new AppError("Invoice is already void", 409);
    }
    if (invoice.status !== "issued") {
      throw new AppError("Only issued invoices can be voided", 409);
    }

    const updated = await client.query(
      `UPDATE booking_invoices
       SET status = 'void', voided_at = NOW(), void_reason = $2
       WHERE id = $1
       RETURNING ${INVOICE_SELECT}`,
      [invoiceId, voidReason]
    );

    const sync = await syncBookingPaymentStatus(client, bookingId);
    await client.query("COMMIT");

    return {
      data: mapInvoiceRow(updated.rows[0]),
      payment_status: sync.payment_status,
      net_paid: sync.net_paid,
      billed_total: sync.billed_total,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  listInvoices,
  getInvoice,
  createDraftInvoice,
  refreshDraftInvoice,
  issueInvoice,
  voidInvoice,
};
