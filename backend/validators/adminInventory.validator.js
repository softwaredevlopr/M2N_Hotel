/**
 * Admin inventory-date write validation.
 * Columns verified against migration 005 / room_type_inventory_dates.
 */

const {
  parseDate,
  parseUuid,
  parseInteger,
  trimOrNull,
} = require("./booking.validator");

const INVENTORY_DATE_SOURCES = ["manual", "system", "ota", "channel"];
const SMALLINT_MAX = 32767;

const UPSERT_ALLOWED_KEYS = new Set([
  "hotel_id",
  "room_type_id",
  "inventory_date",
  "allotment",
  "stop_sell",
  "overbooking_allowance",
  "source",
]);

const DELETE_ALLOWED_KEYS = new Set([
  "hotel_id",
  "room_type_id",
  "inventory_date",
]);

function rejectUnknownKeys(source, allowed, errors) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    errors.push("Request body must be an object");
    return;
  }
  Object.keys(source).forEach((key) => {
    if (!allowed.has(key)) {
      errors.push(`Unknown field: ${key}`);
    }
  });
}

function parseBooleanField(value, field, errors, { required = false, fallback } = {}) {
  if (value === undefined) {
    if (required) errors.push(`${field} is required`);
    return fallback;
  }
  if (value === null) {
    errors.push(`${field} must be a boolean`);
    return fallback;
  }
  if (typeof value === "boolean") return value;
  errors.push(`${field} must be a boolean`);
  return fallback;
}

/**
 * allotment: omit → null (use physical); explicit null → null; else integer >= 0.
 */
function parseAllotment(value, errors) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return parseInteger(value, "allotment", errors, {
    min: 0,
    max: SMALLINT_MAX,
    fallback: null,
  });
}

function parseUpsertInventoryDateBody(body = {}) {
  const errors = [];
  rejectUnknownKeys(body, UPSERT_ALLOWED_KEYS, errors);

  const hotelId = parseUuid(body.hotel_id, "hotel_id", errors);
  const roomTypeId = parseUuid(body.room_type_id, "room_type_id", errors);
  const inventoryDate = parseDate(body.inventory_date, "inventory_date", errors);

  const hasMutableField =
    Object.prototype.hasOwnProperty.call(body, "allotment") ||
    Object.prototype.hasOwnProperty.call(body, "stop_sell") ||
    Object.prototype.hasOwnProperty.call(body, "overbooking_allowance") ||
    Object.prototype.hasOwnProperty.call(body, "source");

  if (!hasMutableField) {
    errors.push(
      "Provide at least one of: allotment, stop_sell, overbooking_allowance, source"
    );
  }

  const allotment = Object.prototype.hasOwnProperty.call(body, "allotment")
    ? parseAllotment(body.allotment, errors)
    : null;

  const stopSell = Object.prototype.hasOwnProperty.call(body, "stop_sell")
    ? parseBooleanField(body.stop_sell, "stop_sell", errors, {
        required: true,
      })
    : false;

  const overbookingAllowance = Object.prototype.hasOwnProperty.call(
    body,
    "overbooking_allowance"
  )
    ? parseInteger(body.overbooking_allowance, "overbooking_allowance", errors, {
        min: 0,
        max: SMALLINT_MAX,
        fallback: 0,
      })
    : 0;

  let source = "manual";
  if (Object.prototype.hasOwnProperty.call(body, "source")) {
    const raw = trimOrNull(body.source);
    if (raw === null) {
      errors.push("source is required when provided");
    } else if (!INVENTORY_DATE_SOURCES.includes(raw)) {
      errors.push(
        `source must be one of: ${INVENTORY_DATE_SOURCES.join(", ")}`
      );
    } else {
      source = raw;
    }
  }

  return {
    hotelId,
    roomTypeId,
    inventoryDate,
    allotment,
    stopSell: stopSell === undefined ? false : stopSell,
    overbookingAllowance:
      overbookingAllowance === undefined ? 0 : overbookingAllowance,
    source,
    errors,
  };
}

function parseDeleteInventoryDateQuery(query = {}) {
  const errors = [];
  rejectUnknownKeys(query, DELETE_ALLOWED_KEYS, errors);

  const hotelId = parseUuid(query.hotel_id, "hotel_id", errors);
  const roomTypeId = parseUuid(query.room_type_id, "room_type_id", errors);
  const inventoryDate = parseDate(query.inventory_date, "inventory_date", errors);

  return { hotelId, roomTypeId, inventoryDate, errors };
}

module.exports = {
  INVENTORY_DATE_SOURCES,
  SMALLINT_MAX,
  parseUpsertInventoryDateBody,
  parseDeleteInventoryDateQuery,
};
