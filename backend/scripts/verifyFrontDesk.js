/**
 * Phase 12 PMS Lite — hotel-scoped stats, Front Desk list filters, status
 * actions, and room-board APIs (existing rooms list/PATCH). No schema change.
 * Server must be running on :5001.
 *
 * Usage: node scripts/verifyFrontDesk.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");
const { signAdminToken } = require("../utils/adminAuth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";

let passed = 0;
let failed = 0;
const createdBookingNumbers = [];

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

async function cleanup() {
  if (createdBookingNumbers.length === 0) return;
  const result = await query(
    `DELETE FROM bookings WHERE booking_number = ANY($1::text[]) RETURNING booking_number`,
    [createdBookingNumbers]
  );
  console.log(`\nCleaned up ${result.rows.length} verification booking(s).`);
}

async function main() {
  const health = await api("GET", "/health");
  check(
    "backend health",
    health.status === 200 && health.body?.status === "healthy"
  );

  const adminResult = await query(
    `SELECT id, email, role FROM admin_users WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1`
  );
  const admin = adminResult.rows[0];
  check("active admin exists", Boolean(admin));
  if (!admin) throw new Error("No admin — run npm run seed:admin");

  const types = await query(
    `SELECT rt.id AS room_type_id, rt.hotel_id, h.name AS hotel_name,
            (
              SELECT COUNT(*)::int FROM rooms r
              WHERE r.room_type_id = rt.id
                AND r.status IN ('available', 'occupied')
            ) AS sellable
     FROM room_types rt
     INNER JOIN hotels h ON h.id = rt.hotel_id
     WHERE rt.status = 'active' AND h.status = 'active'
     ORDER BY sellable DESC, rt.created_at ASC`
  );
  const hotelA = types.rows[0];
  check("hotel A fixture", Boolean(hotelA));
  if (!hotelA) throw new Error("No fixture room type");

  const hotelB = types.rows.find((row) => row.hotel_id !== hotelA.hotel_id);
  check("hotel B fixture", Boolean(hotelB));
  if (!hotelB) throw new Error("Need a second hotel for isolation");

  const token = signAdminToken(admin);
  const today = new Date().toISOString().slice(0, 10);
  const stayIn = isoDaysFromNow(180);
  const stayOn = isoDaysFromNow(181);
  const stayOut = isoDaysFromNow(183);

  section("Auth + validation");
  const unauth = await api(
    "GET",
    `/api/admin/bookings/stats?hotel_id=${hotelA.hotel_id}`
  );
  check("scoped stats require auth", unauth.status === 401);

  const badId = await api("GET", "/api/admin/bookings/stats?hotel_id=not-a-uuid", {
    token,
  });
  check("invalid hotel_id 400", badId.status === 400);

  const emptyId = await api("GET", "/api/admin/bookings/stats?hotel_id=", {
    token,
  });
  check(
    "empty hotel_id is unscoped",
    emptyId.status === 200 && emptyId.body?.data?.hotel_id == null
  );

  section("Unscoped stats unchanged");
  const unscoped = await api("GET", "/api/admin/bookings/stats", { token });
  check("unscoped stats 200", unscoped.status === 200);
  check(
    "unscoped hotel_id is null",
    unscoped.body?.data?.hotel_id == null
  );
  check(
    "unscoped shape",
    typeof unscoped.body?.data?.arrivals_today === "number" &&
      typeof unscoped.body?.data?.departures_today === "number" &&
      typeof unscoped.body?.data?.upcoming === "number" &&
      unscoped.body?.data?.by_status &&
      unscoped.body?.data?.occupancy &&
      unscoped.body?.data?.today === today
  );

  section("Hotel-scoped stats isolation");
  const beforeA = await api(
    "GET",
    `/api/admin/bookings/stats?hotel_id=${hotelA.hotel_id}`,
    { token }
  );
  const beforeB = await api(
    "GET",
    `/api/admin/bookings/stats?hotel_id=${hotelB.hotel_id}`,
    { token }
  );
  check("hotel A stats 200", beforeA.status === 200);
  check("hotel A hotel_id echoed", beforeA.body?.data?.hotel_id === hotelA.hotel_id);
  check("hotel B stats 200", beforeB.status === 200);
  check("hotel B hotel_id echoed", beforeB.body?.data?.hotel_id === hotelB.hotel_id);

  const sellableA = await query(
    `SELECT COUNT(*)::int AS n FROM rooms
     WHERE hotel_id = $1 AND status = ANY($2::text[])`,
    [hotelA.hotel_id, ["available", "occupied"]]
  );
  check(
    "hotel A sellable_rooms matches rooms table",
    beforeA.body?.data?.occupancy?.sellable_rooms === sellableA.rows[0].n
  );
  check(
    "scoped sellable_rooms <= unscoped",
    beforeA.body?.data?.occupancy?.sellable_rooms <=
      unscoped.body?.data?.occupancy?.sellable_rooms
  );

  const arrivalA = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "FrontDesk HotelA Arrival",
      guest_email: "frontdesk-a@booking-selftest.invalid",
      guest_phone: "+91 98765 00030",
      check_in_date: today,
      check_out_date: isoDaysFromNow(2),
      booking_status: "confirmed",
    },
  });
  if (arrivalA.body?.data?.booking_number) {
    createdBookingNumbers.push(arrivalA.body.data.booking_number);
  }
  check("hotel A today arrival create 201", arrivalA.status === 201, `got ${arrivalA.status}`);

  const afterA = await api(
    "GET",
    `/api/admin/bookings/stats?hotel_id=${hotelA.hotel_id}`,
    { token }
  );
  const afterB = await api(
    "GET",
    `/api/admin/bookings/stats?hotel_id=${hotelB.hotel_id}`,
    { token }
  );
  check(
    "hotel A arrivals increment",
    afterA.body?.data?.arrivals_today ===
      (beforeA.body?.data?.arrivals_today || 0) + 1
  );
  check(
    "hotel B arrivals unchanged",
    afterB.body?.data?.arrivals_today === beforeB.body?.data?.arrivals_today
  );

  section("List check_out + stay_on filters");
  const stayBooking = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "FrontDesk StayOn",
      guest_email: "frontdesk-stay@booking-selftest.invalid",
      guest_phone: "+91 98765 00031",
      check_in_date: stayIn,
      check_out_date: stayOut,
      booking_status: "confirmed",
    },
  });
  if (stayBooking.body?.data?.booking_number) {
    createdBookingNumbers.push(stayBooking.body.data.booking_number);
  }
  check("stay-on fixture 201", stayBooking.status === 201, `got ${stayBooking.status}`);
  const stayId = stayBooking.body?.data?.id;

  const departureBooking = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "FrontDesk Departure",
      guest_email: "frontdesk-dep@booking-selftest.invalid",
      guest_phone: "+91 98765 00032",
      check_in_date: stayIn,
      check_out_date: stayOn,
      booking_status: "confirmed",
    },
  });
  if (departureBooking.body?.data?.booking_number) {
    createdBookingNumbers.push(departureBooking.body.data.booking_number);
  }
  check(
    "departure fixture 201",
    departureBooking.status === 201,
    `got ${departureBooking.status}`
  );

  const badStay = await api("GET", "/api/admin/bookings?stay_on=2026-13-45", {
    token,
  });
  check("stay_on malformed 400", badStay.status === 400);

  const badOut = await api(
    "GET",
    "/api/admin/bookings?check_out_from=not-a-date",
    { token }
  );
  check("check_out_from malformed 400", badOut.status === 400);

  const stayList = await api(
    "GET",
    `/api/admin/bookings?hotel_id=${hotelA.hotel_id}&stay_on=${stayOn}&limit=100`,
    { token }
  );
  check("stay_on list 200", stayList.status === 200);
  const stayRows = stayList.body?.data || [];
  check(
    "stay_on includes overnight booking",
    stayRows.some((row) => row.id === stayId)
  );
  check(
    "stay_on rows overlap the date",
    stayRows.every(
      (row) =>
        String(row.check_in_date).slice(0, 10) <= stayOn &&
        String(row.check_out_date).slice(0, 10) > stayOn &&
        row.hotel_id === hotelA.hotel_id
    )
  );
  check(
    "stay_on excludes checkout-on-date booking",
    !stayRows.some((row) => row.id === departureBooking.body?.data?.id)
  );

  const outList = await api(
    "GET",
    `/api/admin/bookings?hotel_id=${hotelA.hotel_id}&check_out_from=${stayOn}&check_out_to=${stayOn}&limit=100`,
    { token }
  );
  check("check_out window 200", outList.status === 200);
  const outRows = outList.body?.data || [];
  check(
    "check_out includes departure fixture",
    outRows.some((row) => row.id === departureBooking.body?.data?.id)
  );
  check(
    "check_out rows match hotel + date",
    outRows.every(
      (row) =>
        row.hotel_id === hotelA.hotel_id &&
        String(row.check_out_date).slice(0, 10) === stayOn
    )
  );

  const otherHotelStay = await api(
    "GET",
    `/api/admin/bookings?hotel_id=${hotelB.hotel_id}&stay_on=${stayOn}&limit=100`,
    { token }
  );
  check(
    "stay_on hotel B excludes hotel A fixture",
    otherHotelStay.status === 200 &&
      !(otherHotelStay.body?.data || []).some((row) => row.id === stayId)
  );

  section("Front Desk status actions (existing PATCH /status)");
  const pendingArrival = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "FrontDesk Pending CheckIn",
      guest_email: "frontdesk-pending@booking-selftest.invalid",
      guest_phone: "+91 98765 00033",
      check_in_date: isoDaysFromNow(25),
      check_out_date: isoDaysFromNow(27),
      booking_status: "pending",
    },
  });
  if (pendingArrival.body?.data?.booking_number) {
    createdBookingNumbers.push(pendingArrival.body.data.booking_number);
  }
  check("pending arrival 201", pendingArrival.status === 201);
  const pendingCheckIn = await api(
    "PATCH",
    `/api/admin/bookings/${pendingArrival.body?.data?.id}/status`,
    { token, body: { booking_status: "checked_in" } }
  );
  check(
    "pending cannot check in",
    pendingCheckIn.status === 400,
    `got ${pendingCheckIn.status}`
  );

  const confirmedArrival = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "FrontDesk Confirmed CheckIn",
      guest_email: "frontdesk-checkin@booking-selftest.invalid",
      guest_phone: "+91 98765 00034",
      check_in_date: isoDaysFromNow(32),
      check_out_date: isoDaysFromNow(34),
      booking_status: "confirmed",
    },
  });
  if (confirmedArrival.body?.data?.booking_number) {
    createdBookingNumbers.push(confirmedArrival.body.data.booking_number);
  }
  check(
    "confirmed arrival 201",
    confirmedArrival.status === 201,
    `got ${confirmedArrival.status}`
  );
  const checkInOk = await api(
    "PATCH",
    `/api/admin/bookings/${confirmedArrival.body?.data?.id}/status`,
    { token, body: { booking_status: "checked_in" } }
  );
  check("confirmed → checked_in 200", checkInOk.status === 200);
  check(
    "checked_in status persisted",
    checkInOk.body?.data?.booking_status === "checked_in"
  );
  check(
    "checked-in booking stays hotel A",
    checkInOk.body?.data?.hotel_id === hotelA.hotel_id
  );

  const afterCheckInA = await api(
    "GET",
    `/api/admin/bookings/stats?hotel_id=${hotelA.hotel_id}`,
    { token }
  );
  const afterCheckInB = await api(
    "GET",
    `/api/admin/bookings/stats?hotel_id=${hotelB.hotel_id}`,
    { token }
  );
  check(
    "check-in does not move hotel B stats",
    afterCheckInB.body?.data?.arrivals_today === afterB.body?.data?.arrivals_today
  );
  check(
    "hotel A in-house includes checked-in stay",
    (afterCheckInA.body?.data?.occupancy?.in_house_bookings || 0) >= 1
  );

  const checkOutOk = await api(
    "PATCH",
    `/api/admin/bookings/${confirmedArrival.body?.data?.id}/status`,
    { token, body: { booking_status: "checked_out" } }
  );
  check("checked_in → checked_out 200", checkOutOk.status === 200);
  check(
    "checked_out status persisted",
    checkOutOk.body?.data?.booking_status === "checked_out"
  );

  const noShowTarget = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "FrontDesk NoShow",
      guest_email: "frontdesk-noshow@booking-selftest.invalid",
      guest_phone: "+91 98765 00035",
      check_in_date: isoDaysFromNow(28),
      check_out_date: isoDaysFromNow(30),
      booking_status: "confirmed",
    },
  });
  if (noShowTarget.body?.data?.booking_number) {
    createdBookingNumbers.push(noShowTarget.body.data.booking_number);
  }
  check(
    "no-show fixture 201",
    noShowTarget.status === 201,
    `got ${noShowTarget.status}`
  );
  const noShowOk = await api(
    "PATCH",
    `/api/admin/bookings/${noShowTarget.body?.data?.id}/status`,
    {
      token,
      body: {
        booking_status: "no_show",
        cancellation_reason: "Guest did not arrive",
      },
    }
  );
  check("confirmed → no_show 200", noShowOk.status === 200);
  check("no_show status persisted", noShowOk.body?.data?.booking_status === "no_show");
  check(
    "no_show stores cancellation_reason",
    noShowOk.body?.data?.cancellation_reason === "Guest did not arrive"
  );
  check("no_show stamps cancelled_at", Boolean(noShowOk.body?.data?.cancelled_at));

  const inHouseNoShow = await api(
    "PATCH",
    `/api/admin/bookings/${confirmedArrival.body?.data?.id}/status`,
    { token, body: { booking_status: "no_show" } }
  );
  check(
    "checked_out cannot no-show",
    inHouseNoShow.status === 400,
    `got ${inHouseNoShow.status}`
  );

  const multiRoom = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "FrontDesk MultiRoom",
      guest_email: "frontdesk-multi@booking-selftest.invalid",
      guest_phone: "+91 98765 00036",
      check_in_date: isoDaysFromNow(20),
      check_out_date: isoDaysFromNow(22),
      number_of_rooms: 2,
      booking_status: "confirmed",
    },
  });
  if (multiRoom.body?.data?.booking_number) {
    createdBookingNumbers.push(multiRoom.body.data.booking_number);
  }
  check("multi-room fixture 201", multiRoom.status === 201, `got ${multiRoom.status}`);
  const roomRow = await query(
    `SELECT id FROM rooms
     WHERE hotel_id = $1 AND room_type_id = $2
       AND status = ANY($3::text[])
     ORDER BY room_number ASC
     LIMIT 1`,
    [hotelA.hotel_id, hotelA.room_type_id, ["available", "occupied"]]
  );
  const assignableRoomId = roomRow.rows[0]?.id;
  check("assignable physical room exists", Boolean(assignableRoomId));
  if (assignableRoomId && multiRoom.body?.data?.id) {
    const multiAssign = await api(
      "PATCH",
      `/api/admin/bookings/${multiRoom.body.data.id}/assign-room`,
      { token, body: { room_id: assignableRoomId } }
    );
    check(
      "multi-room assign 409",
      multiAssign.status === 409,
      `got ${multiAssign.status}`
    );
  }

  section("Room status board (existing rooms APIs)");
  const roomsUnauth = await api(
    "GET",
    `/api/admin/rooms?hotel_id=${hotelA.hotel_id}`
  );
  check("rooms list requires auth", roomsUnauth.status === 401);

  const roomsA = await api(
    "GET",
    `/api/admin/rooms?hotel_id=${hotelA.hotel_id}`,
    { token }
  );
  check("hotel A rooms 200", roomsA.status === 200);
  const roomsARows = Array.isArray(roomsA.body?.data) ? roomsA.body.data : [];
  check(
    "hotel A rooms isolated",
    roomsARows.every((row) => row.hotel_id === hotelA.hotel_id)
  );
  check(
    "hotel A rooms have board fields",
    roomsARows.length === 0 ||
      roomsARows.every(
        (row) =>
          row.room_number &&
          row.room_type_name &&
          row.status &&
          Object.prototype.hasOwnProperty.call(row, "floor_label")
      )
  );

  const roomsB = await api(
    "GET",
    `/api/admin/rooms?hotel_id=${hotelB.hotel_id}`,
    { token }
  );
  const roomsBRows = Array.isArray(roomsB.body?.data) ? roomsB.body.data : [];
  check("hotel B rooms 200", roomsB.status === 200);
  check(
    "hotel B rooms isolated",
    roomsBRows.every((row) => row.hotel_id === hotelB.hotel_id)
  );
  const hotelARoomIds = new Set(roomsARows.map((row) => row.id));
  check(
    "hotel B list excludes hotel A rooms",
    roomsBRows.every((row) => !hotelARoomIds.has(row.id))
  );

  const boardRoom = roomsARows[0];
  check("hotel A has a physical room", Boolean(boardRoom));

  if (boardRoom) {
    const originalStatus = boardRoom.status;
    const nextStatus = originalStatus === "available" ? "occupied" : "available";
    try {

    const inventedStatus = await api("PATCH", `/api/admin/rooms/${boardRoom.id}`, {
      token,
      body: { status: "housekeeping" },
    });
    check(
      "invented housekeeping status 400",
      inventedStatus.status === 400,
      `got ${inventedStatus.status}`
    );

    const afterInvalid = await api("GET", `/api/admin/rooms/${boardRoom.id}`, {
      token,
    });
    check(
      "invalid status left room unchanged",
      afterInvalid.body?.data?.status === originalStatus &&
        afterInvalid.body?.data?.room_number === boardRoom.room_number
    );

    const patched = await api("PATCH", `/api/admin/rooms/${boardRoom.id}`, {
      token,
      body: { status: nextStatus },
    });
    check("PATCH rooms.status 200", patched.status === 200, `got ${patched.status}`);
    check(
      "operational status persisted",
      patched.body?.data?.status === nextStatus
    );
    check(
      "status-only patch keeps room_number",
      patched.body?.data?.room_number === boardRoom.room_number
    );
    check(
      "status-only patch keeps hotel_id",
      patched.body?.data?.hotel_id === hotelA.hotel_id
    );

    const restored = await api("PATCH", `/api/admin/rooms/${boardRoom.id}`, {
      token,
      body: { status: originalStatus },
    });
    check("restore rooms.status 200", restored.status === 200);
    check(
      "rooms.status restored",
      restored.body?.data?.status === originalStatus
    );

    const sellableRoom = roomsARows.find(
      (row) =>
        row.room_type_id === hotelA.room_type_id &&
        ["available", "occupied"].includes(row.status)
    );
    check(
      "sellable room of hotel A type exists",
      Boolean(sellableRoom)
    );

    if (sellableRoom) {
      const beforeRoom = await api("GET", `/api/admin/rooms/${sellableRoom.id}`, {
        token,
      });
      const statusBefore = beforeRoom.body?.data?.status;

      const occupancyBooking = await api("POST", "/api/admin/bookings", {
        token,
        body: {
          hotel_id: hotelA.hotel_id,
          room_type_id: hotelA.room_type_id,
          guest_name: "FrontDesk RoomBoard",
          guest_email: "frontdesk-roomboard@booking-selftest.invalid",
          guest_phone: "+91 98765 00037",
          check_in_date: isoDaysFromNow(40),
          check_out_date: isoDaysFromNow(42),
          booking_status: "confirmed",
        },
      });
      if (occupancyBooking.body?.data?.booking_number) {
        createdBookingNumbers.push(occupancyBooking.body.data.booking_number);
      }
      check(
        "room-board occupancy fixture 201",
        occupancyBooking.status === 201,
        `got ${occupancyBooking.status}`
      );

      if (occupancyBooking.body?.data?.id) {
        const assigned = await api(
          "PATCH",
          `/api/admin/bookings/${occupancyBooking.body.data.id}/assign-room`,
          { token, body: { room_id: sellableRoom.id } }
        );
        check(
          "assign room for occupancy join 200",
          assigned.status === 200,
          `got ${assigned.status}`
        );

        const afterAssign = await api(
          "GET",
          `/api/admin/rooms/${sellableRoom.id}`,
          { token }
        );
        check(
          "assign-room does not change rooms.status",
          afterAssign.body?.data?.status === statusBefore
        );
        check(
          "assigned room_id persisted",
          assigned.body?.data?.room_id === sellableRoom.id
        );

        const otherTypeRoom = roomsARows.find(
          (row) =>
            row.id !== sellableRoom.id &&
            row.room_type_id === hotelA.room_type_id &&
            ["available", "occupied"].includes(row.status)
        );
        if (otherTypeRoom) {
          const reassigned = await api(
            "PATCH",
            `/api/admin/bookings/${occupancyBooking.body.data.id}/assign-room`,
            { token, body: { room_id: otherTypeRoom.id } }
          );
          check(
            "room assignment change 200",
            reassigned.status === 200,
            `got ${reassigned.status}`
          );
          check(
            "room_id moved to the new room",
            reassigned.body?.data?.room_id === otherTypeRoom.id
          );
          const restoreAssign = await api(
            "PATCH",
            `/api/admin/bookings/${occupancyBooking.body.data.id}/assign-room`,
            { token, body: { room_id: sellableRoom.id } }
          );
          check(
            "restore original room assignment 200",
            restoreAssign.status === 200
          );
        }

        const foreignRoom = roomsBRows.find(
          (row) => ["available", "occupied"].includes(row.status)
        );
        if (foreignRoom) {
          const crossHotelAssign = await api(
            "PATCH",
            `/api/admin/bookings/${occupancyBooking.body.data.id}/assign-room`,
            { token, body: { room_id: foreignRoom.id } }
          );
          check(
            "cross-hotel room assign refused",
            crossHotelAssign.status === 400,
            `got ${crossHotelAssign.status}`
          );
          const stillAssigned = await api(
            "GET",
            `/api/admin/bookings/${occupancyBooking.body.data.id}`,
            { token }
          );
          check(
            "cross-hotel assign left hotel A room_id",
            stillAssigned.body?.data?.room_id === sellableRoom.id
          );
        }

        const checkedIn = await api(
          "PATCH",
          `/api/admin/bookings/${occupancyBooking.body.data.id}/status`,
          { token, body: { booking_status: "checked_in" } }
        );
        check("check-in after assign 200", checkedIn.status === 200);

        const afterCheckIn = await api(
          "GET",
          `/api/admin/rooms/${sellableRoom.id}`,
          { token }
        );
        check(
          "check-in does not auto-change rooms.status",
          afterCheckIn.body?.data?.status === statusBefore
        );

        const checkedOut = await api(
          "PATCH",
          `/api/admin/bookings/${occupancyBooking.body.data.id}/status`,
          { token, body: { booking_status: "checked_out" } }
        );
        check("check-out after assign 200", checkedOut.status === 200);

        const afterCheckOut = await api(
          "GET",
          `/api/admin/rooms/${sellableRoom.id}`,
          { token }
        );
        check(
          "check-out does not auto-change rooms.status",
          afterCheckOut.body?.data?.status === statusBefore
        );
      }
    }
    } finally {
      await api("PATCH", `/api/admin/rooms/${boardRoom.id}`, {
        token,
        body: { status: originalStatus },
      });
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
}

main()
  .catch((error) => {
    failed += 1;
    console.error("\nVerification crashed:", error.message);
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (error) {
      console.error("Cleanup failed:", error.message);
    }
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  });
