const { query } = require("../config/db");
const { AppError } = require("../middleware/error.middleware");
const {
  normalizePhoneForMatch,
  trimOrNull,
} = require("../validators/booking.validator");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const STAY_STATUSES = ["checked_in", "checked_out"];
const OPEN_LEAD_STATUSES = ["pending", "contacted", "quoted"];

/**
 * Derived guest identity (Phase 13 CRM Lite). Not stored.
 * Primary: lower(trim(email)) when email is non-empty.
 * Fallback: last 10 phone digits only when email is empty.
 * Rows with neither key are not grouped (never merged as one guest).
 */
function identitySql(alias) {
  const email = `${alias}.guest_email`;
  const phone = `${alias}.guest_phone`;
  return `CASE
    WHEN ${email} IS NOT NULL AND btrim(${email}) <> ''
      THEN 'email:' || lower(btrim(${email}))
    WHEN ${phone} IS NOT NULL
         AND length(regexp_replace(${phone}, '\\D', '', 'g')) > 0
      THEN 'phone:' || right(regexp_replace(${phone}, '\\D', '', 'g'), 10)
    ELSE NULL
  END`;
}

function parseIdentityKey(raw) {
  const value = trimOrNull(raw);
  if (!value) {
    return { error: "key is required" };
  }
  if (value.startsWith("email:")) {
    const email = value.slice(6).trim().toLowerCase();
    if (!email) return { error: "key email is empty" };
    return { type: "email", value: email, key: `email:${email}` };
  }
  if (value.startsWith("phone:")) {
    const digits = normalizePhoneForMatch(value.slice(6));
    if (!digits) return { error: "key phone is empty" };
    return { type: "phone", value: digits, key: `phone:${digits}` };
  }
  return { error: "key must start with email: or phone:" };
}

function identityMatchSql(alias, parsed) {
  const email = `${alias}.guest_email`;
  const phone = `${alias}.guest_phone`;
  if (parsed.type === "email") {
    return `${email} IS NOT NULL AND btrim(${email}) <> '' AND lower(btrim(${email})) = $2`;
  }
  return `(${email} IS NULL OR btrim(${email}) = '')
    AND ${phone} IS NOT NULL
    AND right(regexp_replace(${phone}, '\\D', '', 'g'), 10) = $2`;
}

function clampLimitOffset(limitRaw, offsetRaw) {
  const parsedLimit = Number(limitRaw);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.floor(parsedLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const parsedOffset = Number(offsetRaw);
  const offset =
    Number.isFinite(parsedOffset) && parsedOffset >= 0
      ? Math.floor(parsedOffset)
      : 0;
  return { limit, offset };
}

function searchPredicate(alias, likeIdx, digitsIdx) {
  return `(
    ${alias}.guest_name ILIKE $${likeIdx}
    OR ${alias}.guest_email ILIKE $${likeIdx}
    OR COALESCE(${alias}.guest_phone, '') ILIKE $${likeIdx}
    OR (
      length($${digitsIdx}) > 2
      AND regexp_replace(COALESCE(${alias}.guest_phone, ''), '\\D', '', 'g')
        LIKE $${digitsIdx}
    )
  )`;
}

function sourceRowsSql(hotelParam, extraBooking = "", extraInquiry = "") {
  return `
    SELECT
      ${identitySql("b")} AS identity_key,
      b.guest_name,
      b.guest_email,
      b.guest_phone,
      b.created_at,
      'booking'::text AS source_kind,
      b.booking_status,
      NULL::varchar AS inquiry_status
    FROM bookings b
    WHERE b.hotel_id = $${hotelParam}
      ${extraBooking}
    UNION ALL
    SELECT
      ${identitySql("i")} AS identity_key,
      i.guest_name,
      i.guest_email,
      i.guest_phone,
      i.created_at,
      'inquiry'::text AS source_kind,
      NULL::varchar AS booking_status,
      i.status AS inquiry_status
    FROM inquiries i
    WHERE i.hotel_id = $${hotelParam}
      ${extraInquiry}
  `;
}

function mapSummaryRow(row) {
  const identityKey = row.identity_key;
  const type = identityKey.startsWith("phone:") ? "phone" : "email";
  const bookingCount = Number(row.booking_count) || 0;
  return {
    identity_key: identityKey,
    identity_type: type,
    display_name: row.display_name || null,
    email: row.email || null,
    phone: row.phone || null,
    booking_count: bookingCount,
    inquiry_count: Number(row.inquiry_count) || 0,
    stay_count: Number(row.stay_count) || 0,
    open_lead_count: Number(row.open_lead_count) || 0,
    is_repeat_guest: bookingCount >= 2,
    first_seen_at: row.first_seen_at,
    last_activity_at: row.last_activity_at,
  };
}

async function listGuests({ hotelId, q, limit: limitRaw, offset: offsetRaw }) {
  const { limit, offset } = clampLimitOffset(limitRaw, offsetRaw);
  const term = trimOrNull(q);
  const params = [hotelId];
  let extraBooking = "";
  let extraInquiry = "";

  if (term) {
    params.push(`%${term}%`);
    const likeIdx = params.length;
    const digits = term.replace(/\D/g, "");
    params.push(digits.length ? `%${digits}%` : "");
    const digitsIdx = params.length;
    extraBooking = `AND ${searchPredicate("b", likeIdx, digitsIdx)}`;
    extraInquiry = `AND ${searchPredicate("i", likeIdx, digitsIdx)}`;
  }

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const matchedCte = term
    ? `,
    matched_rows AS (
      ${sourceRowsSql(1, extraBooking, extraInquiry)}
    )`
    : "";
  const matchedFilter = term
    ? `AND src.identity_key IN (
         SELECT identity_key FROM matched_rows WHERE identity_key IS NOT NULL
       )`
    : "";

  const result = await query(
    `
    WITH source_rows AS (
      ${sourceRowsSql(1)}
    )${matchedCte},
    grouped AS (
      SELECT
        src.identity_key,
        COUNT(*) FILTER (WHERE src.source_kind = 'booking')::int AS booking_count,
        COUNT(*) FILTER (WHERE src.source_kind = 'inquiry')::int AS inquiry_count,
        COUNT(*) FILTER (
          WHERE src.source_kind = 'booking'
            AND src.booking_status IN ('${STAY_STATUSES.join("', '")}')
        )::int AS stay_count,
        COUNT(*) FILTER (
          WHERE src.source_kind = 'inquiry'
            AND src.inquiry_status IN ('${OPEN_LEAD_STATUSES.join("', '")}')
        )::int AS open_lead_count,
        MIN(src.created_at) AS first_seen_at,
        MAX(src.created_at) AS last_activity_at,
        (
          ARRAY_AGG(src.guest_name ORDER BY src.created_at DESC)
          FILTER (WHERE src.guest_name IS NOT NULL AND btrim(src.guest_name) <> '')
        )[1] AS display_name,
        (
          ARRAY_AGG(src.guest_email ORDER BY src.created_at DESC)
          FILTER (WHERE src.guest_email IS NOT NULL AND btrim(src.guest_email) <> '')
        )[1] AS email,
        (
          ARRAY_AGG(src.guest_phone ORDER BY src.created_at DESC)
          FILTER (WHERE src.guest_phone IS NOT NULL AND btrim(src.guest_phone) <> '')
        )[1] AS phone
      FROM source_rows src
      WHERE src.identity_key IS NOT NULL
        ${matchedFilter}
      GROUP BY src.identity_key
    )
    SELECT *, COUNT(*) OVER()::int AS total_count
    FROM grouped
    ORDER BY last_activity_at DESC NULLS LAST, identity_key ASC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `,
    params
  );

  const total = result.rows.length > 0 ? result.rows[0].total_count : 0;
  const data = result.rows.map(({ total_count: _ignored, ...row }) =>
    mapSummaryRow(row)
  );

  return {
    hotel_id: hotelId,
    count: data.length,
    total,
    limit,
    offset,
    data,
  };
}

async function getGuestProfile({ hotelId, key }) {
  const parsed = parseIdentityKey(key);
  if (parsed.error) {
    throw new AppError(parsed.error, 400);
  }

  const matchBooking = identityMatchSql("b", parsed);
  const matchInquiry = identityMatchSql("i", parsed);

  const [bookingsResult, inquiriesResult] = await Promise.all([
    query(
      `SELECT
         b.id, b.booking_number, b.hotel_id,
         b.guest_name, b.guest_email, b.guest_phone,
         to_char(b.check_in_date, 'YYYY-MM-DD') AS check_in_date,
         to_char(b.check_out_date, 'YYYY-MM-DD') AS check_out_date,
         b.adults, b.children, b.number_of_rooms,
         b.booking_source, b.booking_status, b.payment_status,
         b.admin_notes, b.created_at,
         rt.name AS room_type_name,
         r.room_number
       FROM bookings b
       INNER JOIN room_types rt ON rt.id = b.room_type_id
       LEFT JOIN rooms r ON r.id = b.room_id
       WHERE b.hotel_id = $1
         AND ${matchBooking}
       ORDER BY b.check_in_date DESC, b.created_at DESC`,
      [hotelId, parsed.value]
    ),
    query(
      `SELECT
         i.id, i.hotel_id,
         i.guest_name, i.guest_email, i.guest_phone,
         to_char(i.check_in_date, 'YYYY-MM-DD') AS check_in_date,
         to_char(i.check_out_date, 'YYYY-MM-DD') AS check_out_date,
         i.adults_count, i.children_count,
         i.message, i.source, i.status, i.admin_notes, i.created_at,
         rt.name AS room_type_name
       FROM inquiries i
       LEFT JOIN room_types rt ON rt.id = i.room_type_id
       WHERE i.hotel_id = $1
         AND ${matchInquiry}
       ORDER BY i.created_at DESC`,
      [hotelId, parsed.value]
    ),
  ]);

  const bookings = bookingsResult.rows;
  const inquiries = inquiriesResult.rows;
  if (bookings.length === 0 && inquiries.length === 0) {
    throw new AppError("Guest not found for this hotel", 404);
  }

  const timeline = [
    ...bookings.map((row) => ({
      at: row.created_at,
      name: row.guest_name,
      email: row.guest_email,
      phone: row.guest_phone,
    })),
    ...inquiries.map((row) => ({
      at: row.created_at,
      name: row.guest_name,
      email: row.guest_email,
      phone: row.guest_phone,
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  const latest = (field) => {
    const hit = timeline.find((row) => trimOrNull(row[field]));
    return hit ? trimOrNull(hit[field]) : null;
  };

  const stayCount = bookings.filter((row) =>
    STAY_STATUSES.includes(row.booking_status)
  ).length;
  const openLeads = inquiries.filter((row) =>
    OPEN_LEAD_STATUSES.includes(row.status)
  );
  const staffNotes = [
    ...bookings
      .filter((row) => trimOrNull(row.admin_notes))
      .map((row) => ({
        source_kind: "booking",
        id: row.id,
        hotel_id: row.hotel_id,
        label: row.booking_number,
        status: row.booking_status,
        admin_notes: row.admin_notes,
        created_at: row.created_at,
      })),
    ...inquiries
      .filter((row) => trimOrNull(row.admin_notes))
      .map((row) => ({
        source_kind: "inquiry",
        id: row.id,
        hotel_id: row.hotel_id,
        label: row.guest_name,
        status: row.status,
        admin_notes: row.admin_notes,
        created_at: row.created_at,
      })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const createdTimes = timeline.map((row) => row.at);

  return {
    hotel_id: hotelId,
    data: {
      identity_key: parsed.key,
      identity_type: parsed.type,
      contact: {
        display_name: latest("name"),
        email: latest("email"),
        phone: latest("phone"),
      },
      summary: {
        booking_count: bookings.length,
        inquiry_count: inquiries.length,
        stay_count: stayCount,
        open_lead_count: openLeads.length,
        is_repeat_guest: bookings.length >= 2,
        first_seen_at: createdTimes[createdTimes.length - 1] || null,
        last_activity_at: createdTimes[0] || null,
      },
      open_leads: openLeads,
      staff_notes: staffNotes,
      bookings,
      inquiries,
    },
  };
}

module.exports = {
  listGuests,
  getGuestProfile,
  parseIdentityKey,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  OPEN_LEAD_STATUSES,
};
