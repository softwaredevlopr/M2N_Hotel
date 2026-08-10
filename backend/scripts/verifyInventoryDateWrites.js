/**
 * Admin inventory-date write API verification (upsert + delete/clear).
 * Requires running server with migration 005 applied.
 *
 * Usage: node scripts/verifyInventoryDateWrites.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");
const { signAdminToken } = require("../utils/adminAuth");
const bookingService = require("../services/booking.service");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";

let passed = 0;
let failed = 0;
const createdInventoryIds = [];

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function api(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, body: json };
}

function isoDaysFromNow(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function trackId(payload) {
  const id = payload?.data?.id || payload?.data?.override?.id;
  if (id && !createdInventoryIds.includes(id)) createdInventoryIds.push(id);
}

async function cleanup() {
  if (createdInventoryIds.length === 0) return;
  const result = await query(
    `DELETE FROM room_type_inventory_dates WHERE id = ANY($1::uuid[]) RETURNING id`,
    [createdInventoryIds]
  );
  console.log(`\nCleaned up ${result.rows.length} inventory override row(s).`);
}

async function main() {
  const health = await api("GET", "/health");
  check("backend health", health.status === 200);

  const admin = (
    await query(
      `SELECT id, email, role FROM admin_users WHERE is_active = TRUE
       ORDER BY created_at ASC LIMIT 1`
    )
  ).rows[0];
  check("active admin exists", Boolean(admin));
  if (!admin) throw new Error("No admin");
  const token = signAdminToken(admin);

  const hotels = (
    await query(
      `SELECT h.id, h.slug,
              (
                SELECT rt.id FROM room_types rt
                WHERE rt.hotel_id = h.id AND rt.status = 'active'
                ORDER BY rt.created_at ASC LIMIT 1
              ) AS room_type_id,
              (
                SELECT COUNT(*)::int FROM rooms r
                INNER JOIN room_types rt ON rt.id = r.room_type_id
                WHERE r.hotel_id = h.id
                  AND rt.status = 'active'
                  AND r.status IN ('available', 'occupied')
                  AND r.room_type_id = (
                    SELECT rt2.id FROM room_types rt2
                    WHERE rt2.hotel_id = h.id AND rt2.status = 'active'
                    ORDER BY rt2.created_at ASC LIMIT 1
                  )
              ) AS physical
       FROM hotels h
       WHERE h.status = 'active'
       ORDER BY h.created_at ASC
       LIMIT 2`
    )
  ).rows;

  check("at least one hotel fixture", hotels.length >= 1 && hotels[0].room_type_id);
  check(
    "second hotel available for isolation",
    hotels.length >= 2 && Boolean(hotels[1].room_type_id)
  );

  const hotelA = hotels[0];
  const hotelB = hotels[1] || null;
  const day = isoDaysFromNow(90);
  const day2 = addDays(day, 1);

  section("Auth required");
  const unauth = await api("PUT", "/api/admin/inventory/dates", {
    body: {
      hotel_id: hotelA.id,
      room_type_id: hotelA.room_type_id,
      inventory_date: day,
      stop_sell: true,
    },
  });
  check("upsert requires auth", unauth.status === 401);

  section("Successful insert");
  const inserted = await api("PUT", "/api/admin/inventory/dates", {
    token,
    body: {
      hotel_id: hotelA.id,
      room_type_id: hotelA.room_type_id,
      inventory_date: day,
      allotment: 1,
      stop_sell: false,
      overbooking_allowance: 0,
      source: "manual",
    },
  });
  check("insert returns 201", inserted.status === 201, `got ${inserted.status}`);
  check("insert created flag", inserted.body?.data?.created === true);
  check("insert allotment = 1", inserted.body?.data?.allotment === 1);
  trackId(inserted.body);

  section("Successful upsert/update");
  const updated = await api("PUT", "/api/admin/inventory/dates", {
    token,
    body: {
      hotel_id: hotelA.id,
      room_type_id: hotelA.room_type_id,
      inventory_date: day,
      allotment: 2,
      stop_sell: false,
      overbooking_allowance: 1,
      source: "manual",
    },
  });
  check("update returns 200", updated.status === 200, `got ${updated.status}`);
  check("update created=false", updated.body?.data?.created === false);
  check("update allotment = 2", updated.body?.data?.allotment === 2);
  check(
    "update overbooking_allowance = 1",
    updated.body?.data?.overbooking_allowance === 1
  );
  trackId(updated.body);

  section("Stop-sell via write API");
  const stopped = await api("PUT", "/api/admin/inventory/dates", {
    token,
    body: {
      hotel_id: hotelA.id,
      room_type_id: hotelA.room_type_id,
      inventory_date: day,
      stop_sell: true,
      source: "manual",
    },
  });
  check("stop-sell upsert 200", stopped.status === 200);
  check("stop-sell persisted", stopped.body?.data?.stop_sell === true);
  check(
    "day payload available_rooms = 0",
    stopped.body?.data?.day?.available_rooms === 0
  );
  const availStop = await bookingService.checkAvailability({
    hotelId: hotelA.id,
    roomTypeId: hotelA.room_type_id,
    checkIn: day,
    checkOut: day2,
  });
  check("availability after stop-sell is 0", availStop.available_rooms === 0);
  check("availability stop_sell true", availStop.stop_sell === true);
  trackId(stopped.body);

  section("Allotment via write API");
  const allotment = await api("PUT", "/api/admin/inventory/dates", {
    token,
    body: {
      hotel_id: hotelA.id,
      room_type_id: hotelA.room_type_id,
      inventory_date: day,
      allotment: 1,
      stop_sell: false,
      overbooking_allowance: 0,
    },
  });
  check("allotment upsert 200", allotment.status === 200);
  check("allotment day sell_limit = 1", allotment.body?.data?.day?.sell_limit === 1);
  const availAllot = await bookingService.checkAvailability({
    hotelId: hotelA.id,
    roomTypeId: hotelA.room_type_id,
    checkIn: day,
    checkOut: day2,
  });
  check(
    "availability respects allotment",
    availAllot.available_rooms === Math.max(1 - availAllot.booked_rooms, 0)
  );
  trackId(allotment.body);

  section("Overbooking allowance via write API");
  const over = await api("PUT", "/api/admin/inventory/dates", {
    token,
    body: {
      hotel_id: hotelA.id,
      room_type_id: hotelA.room_type_id,
      inventory_date: day,
      allotment: null,
      stop_sell: false,
      overbooking_allowance: 2,
      source: "system",
    },
  });
  check("overbooking upsert 200", over.status === 200);
  check("source system persisted", over.body?.data?.source === "system");
  check(
    "day sell_limit = physical + 2",
    over.body?.data?.day?.sell_limit ===
      (over.body?.data?.day?.physical_total || 0) + 2
  );
  trackId(over.body);

  section("Invalid hotel / room type relationship");
  if (hotelB) {
    const cross = await api("PUT", "/api/admin/inventory/dates", {
      token,
      body: {
        hotel_id: hotelB.id,
        room_type_id: hotelA.room_type_id,
        inventory_date: day,
        stop_sell: true,
      },
    });
    check(
      "cross-hotel room type rejected 400",
      cross.status === 400,
      `got ${cross.status}`
    );
  }

  const missingHotel = await api("PUT", "/api/admin/inventory/dates", {
    token,
    body: {
      hotel_id: "00000000-0000-4000-8000-000000000099",
      room_type_id: hotelA.room_type_id,
      inventory_date: day,
      stop_sell: true,
    },
  });
  check("unknown hotel 404", missingHotel.status === 404);

  section("Invalid values / unknown fields");
  const badAllotment = await api("PUT", "/api/admin/inventory/dates", {
    token,
    body: {
      hotel_id: hotelA.id,
      room_type_id: hotelA.room_type_id,
      inventory_date: day,
      allotment: -1,
    },
  });
  check("negative allotment 400", badAllotment.status === 400);

  const badSource = await api("PUT", "/api/admin/inventory/dates", {
    token,
    body: {
      hotel_id: hotelA.id,
      room_type_id: hotelA.room_type_id,
      inventory_date: day,
      source: "pms",
    },
  });
  check("invalid source 400", badSource.status === 400);

  const unknownField = await api("PUT", "/api/admin/inventory/dates", {
    token,
    body: {
      hotel_id: hotelA.id,
      room_type_id: hotelA.room_type_id,
      inventory_date: day,
      stop_sell: false,
      channel_code: "BDC",
    },
  });
  check("unknown field 400", unknownField.status === 400);

  const noMutable = await api("PUT", "/api/admin/inventory/dates", {
    token,
    body: {
      hotel_id: hotelA.id,
      room_type_id: hotelA.room_type_id,
      inventory_date: day,
    },
  });
  check("keys-only body 400", noMutable.status === 400);

  const badDate = await api("PUT", "/api/admin/inventory/dates", {
    token,
    body: {
      hotel_id: hotelA.id,
      room_type_id: hotelA.room_type_id,
      inventory_date: "2026-02-31",
      stop_sell: true,
    },
  });
  check("invalid calendar date 400", badDate.status === 400);

  section("Delete / clear override");
  const cleared = await api(
    "DELETE",
    `/api/admin/inventory/dates?hotel_id=${hotelA.id}&room_type_id=${hotelA.room_type_id}&inventory_date=${day}`,
    { token }
  );
  check("delete returns 200", cleared.status === 200, `got ${cleared.status}`);
  check("delete deleted=true", cleared.body?.data?.deleted === true);

  const afterClear = await bookingService.checkAvailability({
    hotelId: hotelA.id,
    roomTypeId: hotelA.room_type_id,
    checkIn: day,
    checkOut: day2,
  });
  const physical = Number(hotelA.physical) || 0;
  check(
    "availability restored after clear",
    afterClear.stop_sell === false &&
      afterClear.available_rooms ===
        Math.max(physical - afterClear.booked_rooms, 0),
    `available=${afterClear.available_rooms} physical=${physical}`
  );

  const deleteAgain = await api(
    "DELETE",
    `/api/admin/inventory/dates?hotel_id=${hotelA.id}&room_type_id=${hotelA.room_type_id}&inventory_date=${day}`,
    { token }
  );
  check("second delete 404", deleteAgain.status === 404);

  section("Multi-property isolation on delete");
  if (hotelB) {
    const seedB = await api("PUT", "/api/admin/inventory/dates", {
      token,
      body: {
        hotel_id: hotelB.id,
        room_type_id: hotelB.room_type_id,
        inventory_date: day,
        stop_sell: true,
      },
    });
    trackId(seedB.body);
    check("hotel B stop-sell created", seedB.status === 201 || seedB.status === 200);

    const wrongDelete = await api(
      "DELETE",
      `/api/admin/inventory/dates?hotel_id=${hotelA.id}&room_type_id=${hotelB.room_type_id}&inventory_date=${day}`,
      { token }
    );
    check(
      "delete with mismatched hotel/room type fails",
      wrongDelete.status === 400 || wrongDelete.status === 404,
      `got ${wrongDelete.status}`
    );

    const stillThere = await query(
      `SELECT stop_sell FROM room_type_inventory_dates
       WHERE hotel_id = $1 AND room_type_id = $2 AND inventory_date = $3::date`,
      [hotelB.id, hotelB.room_type_id, day]
    );
    check(
      "hotel B override untouched",
      stillThere.rows[0]?.stop_sell === true
    );

    const deleteB = await api(
      "DELETE",
      `/api/admin/inventory/dates?hotel_id=${hotelB.id}&room_type_id=${hotelB.room_type_id}&inventory_date=${day}`,
      { token }
    );
    check("hotel B clear 200", deleteB.status === 200);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  await cleanup();
  await pool.end();
  if (failed > 0) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  try {
    await cleanup();
  } catch {
    /* ignore */
  }
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
