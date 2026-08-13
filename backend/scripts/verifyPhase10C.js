/**
 * Phase 10C admin bookings verification.
 * Uses a signed JWT from an existing admin_users row (same approach as testBookings).
 * Does not invent credentials or change schema.
 *
 * Usage: node scripts/verifyPhase10C.js   (server must be running on :5001)
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
  check("backend health", health.status === 200 && health.body?.status === "healthy");

  const adminResult = await query(
    `SELECT id, email, role FROM admin_users WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1`
  );
  const admin = adminResult.rows[0];
  check("active admin exists", Boolean(admin));
  if (!admin) throw new Error("No admin — run npm run seed:admin");

  const rooms = await query(
    `SELECT rt.id AS room_type_id, rt.hotel_id, h.slug AS hotel_slug
     FROM room_types rt
     INNER JOIN hotels h ON h.id = rt.hotel_id
     WHERE rt.status = 'active' AND h.status = 'active'
     ORDER BY rt.created_at ASC LIMIT 1`
  );
  const fixture = rooms.rows[0];
  check("active hotel/room type fixture", Boolean(fixture));
  if (!fixture) throw new Error("No fixture room type");

  const token = signAdminToken(admin);
  const checkIn = isoDaysFromNow(40);
  const checkOut = isoDaysFromNow(42);

  section("Auth gate");
  const unauth = await api("GET", "/api/admin/bookings");
  check("unauthenticated list returns 401", unauth.status === 401);
  const unauthStats = await api("GET", "/api/admin/bookings/stats");
  check("unauthenticated stats returns 401", unauthStats.status === 401);
  const unauthDetail = await api(
    "GET",
    "/api/admin/bookings/00000000-0000-0000-0000-000000000001"
  );
  check("unauthenticated detail returns 401", unauthDetail.status === 401);

  section("Create fixture booking via admin API");
  const created = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase10C Verifier",
      guest_email: "phase10c-verify@booking-selftest.invalid",
      guest_phone: "+91 98765 00010",
      check_in_date: checkIn,
      check_out_date: checkOut,
      adults: 2,
      children: 0,
      number_of_rooms: 1,
      booking_status: "pending",
      special_requests: "Verification booking",
    },
  });
  check("admin create returns 201", created.status === 201, `got ${created.status}`);
  const booking = created.body?.data;
  if (booking?.booking_number) createdBookingNumbers.push(booking.booking_number);
  check("created booking has id + number", Boolean(booking?.id && booking?.booking_number));

  section("List / search / filters / sort / pagination");
  const list = await api("GET", "/api/admin/bookings?limit=10&offset=0", { token });
  check("authenticated list 200", list.status === 200);
  check("list has data array", Array.isArray(list.body?.data));
  check("list has total/limit/offset", typeof list.body?.total === "number");

  const searched = await api(
    "GET",
    `/api/admin/bookings?search=${encodeURIComponent(booking.booking_number)}`,
    { token }
  );
  check(
    "search by booking number",
    searched.status === 200 &&
      (searched.body?.data || []).some((b) => b.id === booking.id)
  );

  const byHotel = await api(
    "GET",
    `/api/admin/bookings?hotel_id=${fixture.hotel_id}&limit=50`,
    { token }
  );
  check(
    "hotel filter",
    byHotel.status === 200 &&
      (byHotel.body?.data || []).every((b) => b.hotel_id === fixture.hotel_id)
  );

  const byStatus = await api(
    "GET",
    "/api/admin/bookings?booking_status=pending&limit=50",
    { token }
  );
  check(
    "status filter",
    byStatus.status === 200 &&
      (byStatus.body?.data || []).every((b) => b.booking_status === "pending")
  );

  const byDate = await api(
    "GET",
    `/api/admin/bookings?check_in_from=${checkIn}&check_in_to=${checkIn}`,
    { token }
  );
  check(
    "date filter",
    byDate.status === 200 &&
      (byDate.body?.data || []).every(
        (b) => String(b.check_in_date).slice(0, 10) === checkIn
      )
  );

  const sorted = await api(
    "GET",
    "/api/admin/bookings?sort=guest_name&order=asc&limit=5",
    { token }
  );
  check(
    "sorting",
    sorted.status === 200 &&
      sorted.body?.sort === "guest_name" &&
      sorted.body?.order === "asc"
  );

  const page2 = await api("GET", "/api/admin/bookings?limit=1&offset=1", { token });
  check(
    "pagination",
    page2.status === 200 &&
      page2.body?.limit === 1 &&
      page2.body?.offset === 1 &&
      (page2.body?.data || []).length <= 1
  );

  section("Detail");
  const detail = await api("GET", `/api/admin/bookings/${booking.id}`, { token });
  check("detail 200", detail.status === 200);
  check(
    "detail fields",
    detail.body?.data?.guest_name === "Phase10C Verifier" &&
      detail.body?.data?.special_requests === "Verification booking" &&
      detail.body?.data?.hotel_name &&
      detail.body?.data?.admin_notes === null
  );

  section("Stats");
  const stats = await api("GET", "/api/admin/bookings/stats", { token });
  check("stats 200", stats.status === 200);
  check(
    "stats shape",
    typeof stats.body?.data?.arrivals_today === "number" &&
      typeof stats.body?.data?.departures_today === "number" &&
      typeof stats.body?.data?.upcoming === "number" &&
      stats.body?.data?.by_status &&
      stats.body?.data?.occupancy
  );

  section("Status transitions + cancellation_reason");
  const illegal = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
    token,
    body: { booking_status: "checked_out" },
  });
  check("blocks pending → checked_out", illegal.status === 400);

  const confirm = await api("PATCH", `/api/admin/bookings/${booking.id}/status`, {
    token,
    body: { booking_status: "confirmed" },
  });
  check("confirm pending → confirmed", confirm.status === 200);
  check("stamps confirmed_at", Boolean(confirm.body?.data?.confirmed_at));

  section("Phase 11 — POST /:id/cancel");
  const unauthCancel = await api("POST", `/api/admin/bookings/${booking.id}/cancel`, {
    body: { cancellation_reason: "no auth" },
  });
  check("cancel requires auth", unauthCancel.status === 401);

  const cancelNoReason = await api(
    "POST",
    `/api/admin/bookings/${booking.id}/cancel`,
    { token, body: {} }
  );
  check("cancel without reason 200", cancelNoReason.status === 200);
  check(
    "cancel sets status cancelled",
    cancelNoReason.body?.data?.booking_status === "cancelled"
  );
  check(
    "cancel stamps cancelled_at",
    Boolean(cancelNoReason.body?.data?.cancelled_at)
  );
  check(
    "cancel reason optional stays null",
    cancelNoReason.body?.data?.cancellation_reason == null
  );

  const cancelAgain = await api(
    "POST",
    `/api/admin/bookings/${booking.id}/cancel`,
    { token, body: { cancellation_reason: "again" } }
  );
  check("second cancel rejected", cancelAgain.status === 400);

  // Separate booking for cancel-with-reason + status-path cancel regression
  const pendingCancel = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase11 Cancel Reason",
      guest_email: "phase11-cancel@booking-selftest.invalid",
      guest_phone: "+91 98765 00020",
      check_in_date: isoDaysFromNow(45),
      check_out_date: isoDaysFromNow(46),
      booking_status: "pending",
    },
  });
  if (pendingCancel.body?.data?.booking_number) {
    createdBookingNumbers.push(pendingCancel.body.data.booking_number);
  }
  const cancelWithReason = await api(
    "POST",
    `/api/admin/bookings/${pendingCancel.body?.data?.id}/cancel`,
    {
      token,
      body: { cancellation_reason: "Phase 11 verification cancel" },
    }
  );
  check("cancel with reason 200", cancelWithReason.status === 200);
  check(
    "persists cancellation_reason via cancel API",
    cancelWithReason.body?.data?.cancellation_reason ===
      "Phase 11 verification cancel"
  );

  const tooLong = await api(
    "POST",
    `/api/admin/bookings/${pendingCancel.body?.data?.id}/cancel`,
    { token, body: { cancellation_reason: "x".repeat(2001) } }
  );
  // Already cancelled — expect 400 (not eligible), not length error first
  check("cancel on cancelled booking 400", tooLong.status === 400);

  const pendingLen = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase11 Cancel Len",
      guest_email: "phase11-cancel-len@booking-selftest.invalid",
      guest_phone: "+91 98765 00021",
      check_in_date: isoDaysFromNow(47),
      check_out_date: isoDaysFromNow(48),
      booking_status: "pending",
    },
  });
  if (pendingLen.body?.data?.booking_number) {
    createdBookingNumbers.push(pendingLen.body.data.booking_number);
  }
  const cancelTooLong = await api(
    "POST",
    `/api/admin/bookings/${pendingLen.body?.data?.id}/cancel`,
    { token, body: { cancellation_reason: "x".repeat(2001) } }
  );
  check("cancel reason maxLength 2000", cancelTooLong.status === 400);

  // Status-path cancel still works (legacy / no_show path neighbour)
  const cancelViaStatus = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase10C Status Cancel",
      guest_email: "phase10c-status-cancel@booking-selftest.invalid",
      guest_phone: "+91 98765 00022",
      check_in_date: isoDaysFromNow(49),
      check_out_date: isoDaysFromNow(50),
      booking_status: "confirmed",
    },
  });
  if (cancelViaStatus.body?.data?.booking_number) {
    createdBookingNumbers.push(cancelViaStatus.body.data.booking_number);
  }
  const cancel = await api(
    "PATCH",
    `/api/admin/bookings/${cancelViaStatus.body?.data?.id}/status`,
    {
      token,
      body: {
        booking_status: "cancelled",
        cancellation_reason: "Phase 10C verification cancel",
      },
    }
  );
  check("status-path cancel still works", cancel.status === 200);
  check(
    "persists cancellation_reason",
    cancel.body?.data?.cancellation_reason === "Phase 10C verification cancel"
  );
  check("stamps cancelled_at", Boolean(cancel.body?.data?.cancelled_at));

  const terminal = await api(
    "PATCH",
    `/api/admin/bookings/${cancelViaStatus.body?.data?.id}/status`,
    {
      token,
      body: { booking_status: "confirmed" },
    }
  );
  check("blocks transition from cancelled", terminal.status === 400);

  // Separate booking for no_show reason path
  const pending2 = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase10C NoShow",
      guest_email: "phase10c-noshow@booking-selftest.invalid",
      guest_phone: "+91 98765 00011",
      check_in_date: isoDaysFromNow(50),
      check_out_date: isoDaysFromNow(51),
      booking_status: "pending",
    },
  });
  if (pending2.body?.data?.booking_number) {
    createdBookingNumbers.push(pending2.body.data.booking_number);
  }
  const noShow = await api(
    "PATCH",
    `/api/admin/bookings/${pending2.body?.data?.id}/status`,
    {
      token,
      body: {
        booking_status: "no_show",
        cancellation_reason: "Guest did not arrive — verification",
      },
    }
  );
  check("pending → no_show", noShow.status === 200);
  check(
    "no_show stores cancellation_reason",
    noShow.body?.data?.cancellation_reason ===
      "Guest did not arrive — verification"
  );
  check("no_show stamps cancelled_at", Boolean(noShow.body?.data?.cancelled_at));

  section("Phase 11 — guest self-service cancel");
  const guestEmail = "phase11-guest-cancel@booking-selftest.invalid";
  const guestPhone = "+91 98765 00030";
  const guestCreate = await api("POST", "/api/bookings", {
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase11 Guest Cancel",
      guest_email: guestEmail,
      guest_phone: guestPhone,
      check_in_date: isoDaysFromNow(90),
      check_out_date: isoDaysFromNow(91),
      adults: 1,
      special_requests: "Guest cancel fixture",
    },
  });
  if (guestCreate.body?.data?.booking_number) {
    createdBookingNumbers.push(guestCreate.body.data.booking_number);
  }
  check("guest booking create 201", guestCreate.status === 201);
  const guestNumber = guestCreate.body?.data?.booking_number;

  const guestBadContact = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(guestNumber)}/cancel`,
    {
      body: {
        email: "wrong@booking-selftest.invalid",
        cancellation_reason: "should not apply",
      },
    }
  );
  check("guest cancel wrong contact 404", guestBadContact.status === 404);

  const guestNoContact = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(guestNumber)}/cancel`,
    { body: { cancellation_reason: "missing contact" } }
  );
  check("guest cancel missing contact 400", guestNoContact.status === 400);

  const guestCancel = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(guestNumber)}/cancel`,
    {
      body: {
        email: guestEmail,
        cancellation_reason: "Plans changed — guest cancel verify",
      },
    }
  );
  check("guest cancel 200", guestCancel.status === 200, `got ${guestCancel.status}`);
  check(
    "guest cancel status cancelled",
    guestCancel.body?.data?.booking_status === "cancelled"
  );
  check(
    "guest cancel reason persisted",
    guestCancel.body?.data?.cancellation_reason ===
      "Plans changed — guest cancel verify"
  );
  check(
    "guest cancel response omits admin_notes",
    guestCancel.body?.data &&
      !Object.prototype.hasOwnProperty.call(guestCancel.body.data, "admin_notes")
  );
  check(
    "guest cancel response omits guest_email",
    guestCancel.body?.data &&
      !Object.prototype.hasOwnProperty.call(guestCancel.body.data, "guest_email")
  );

  const guestCancelAgain = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(guestNumber)}/cancel`,
    { body: { email: guestEmail } }
  );
  check("guest cancel already cancelled 400", guestCancelAgain.status === 400);

  const guestLookup = await api(
    "GET",
    `/api/bookings/${encodeURIComponent(guestNumber)}?email=${encodeURIComponent(
      guestEmail
    )}`
  );
  check(
    "guest lookup shows cancelled",
    guestLookup.status === 200 &&
      guestLookup.body?.data?.booking_status === "cancelled"
  );

  // Ineligible: checked_in cannot be cancelled by guest (admin still can).
  const inHouse = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase11 InHouse",
      guest_email: "phase11-inhouse@booking-selftest.invalid",
      guest_phone: "+91 98765 00031",
      check_in_date: isoDaysFromNow(92),
      check_out_date: isoDaysFromNow(93),
      booking_status: "confirmed",
    },
  });
  if (inHouse.body?.data?.booking_number) {
    createdBookingNumbers.push(inHouse.body.data.booking_number);
  }
  await api("PATCH", `/api/admin/bookings/${inHouse.body?.data?.id}/status`, {
    token,
    body: { booking_status: "checked_in" },
  });
  const guestInHouseCancel = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(
      inHouse.body?.data?.booking_number
    )}/cancel`,
    {
      body: { email: "phase11-inhouse@booking-selftest.invalid" },
    }
  );
  check("guest cannot cancel checked_in", guestInHouseCancel.status === 400);

  const noShowGuestCancel = await api(
    "POST",
    `/api/bookings/${encodeURIComponent(
      pending2.body?.data?.booking_number
    )}/cancel`,
    { body: { email: "phase10c-noshow@booking-selftest.invalid" } }
  );
  check("guest cannot cancel no_show", noShowGuestCancel.status === 400);

  section("Regression — public surfaces");
  const hotels = await api("GET", "/api/hotels");
  check("public hotels still work", hotels.status === 200);
  const roomTypes = await api("GET", "/api/rooms/types");
  check("public room types still work", roomTypes.status === 200);
  const availability = await api(
    "GET",
    `/api/bookings/availability?hotel_slug=${encodeURIComponent(
      fixture.hotel_slug
    )}&check_in_date=${isoDaysFromNow(60)}&check_out_date=${isoDaysFromNow(62)}`
  );
  check("public availability still work", availability.status === 200);
  const availabilityJson = JSON.stringify(availability.body || {});
  check(
    "availability response omits admin_notes",
    !availabilityJson.includes("admin_notes")
  );

  section("Schema — bookings.admin_notes");
  const cols = await query(
    `SELECT data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'bookings'
       AND column_name = 'admin_notes'`
  );
  check("bookings.admin_notes exists", cols.rows.length === 1);
  check(
    "admin_notes is TEXT nullable",
    cols.rows[0]?.data_type === "text" && cols.rows[0]?.is_nullable === "YES"
  );
  check(
    "admin_notes default is NULL",
    cols.rows[0]?.column_default === null
  );

  section("admin_notes — create / update / clear / isolation / privacy");
  const notesBooking = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Phase10C Notes",
      guest_email: "phase10c-notes@booking-selftest.invalid",
      guest_phone: "+91 98765 00012",
      check_in_date: isoDaysFromNow(70),
      check_out_date: isoDaysFromNow(71),
      booking_status: "pending",
      special_requests: "Guest-visible request",
      admin_notes: "Private staff note",
    },
  });
  if (notesBooking.body?.data?.booking_number) {
    createdBookingNumbers.push(notesBooking.body.data.booking_number);
  }
  check("create with admin_notes 201", notesBooking.status === 201);
  check(
    "create returns admin_notes",
    notesBooking.body?.data?.admin_notes === "Private staff note"
  );
  check(
    "special_requests unchanged on create",
    notesBooking.body?.data?.special_requests === "Guest-visible request"
  );
  check(
    "create retains hotel_id",
    notesBooking.body?.data?.hotel_id === fixture.hotel_id
  );

  const notesId = notesBooking.body?.data?.id;
  const notesPatch = await api("PATCH", `/api/admin/bookings/${notesId}`, {
    token,
    body: { admin_notes: "Updated private note" },
  });
  check("patch admin_notes 200", notesPatch.status === 200);
  check(
    "patch persists admin_notes",
    notesPatch.body?.data?.admin_notes === "Updated private note"
  );
  check(
    "patch leaves special_requests alone",
    notesPatch.body?.data?.special_requests === "Guest-visible request"
  );

  const notesClear = await api("PATCH", `/api/admin/bookings/${notesId}`, {
    token,
    body: { admin_notes: "" },
  });
  check("clear admin_notes 200", notesClear.status === 200);
  check(
    "clear stores NULL",
    notesClear.body?.data?.admin_notes === null
  );

  const notesTooLong = await api("PATCH", `/api/admin/bookings/${notesId}`, {
    token,
    body: { admin_notes: "x".repeat(2001) },
  });
  check("admin_notes maxLength 2000", notesTooLong.status === 400);

  const secondHotel = await query(
    `SELECT rt.id AS room_type_id, rt.hotel_id
     FROM room_types rt
     INNER JOIN hotels h ON h.id = rt.hotel_id
     WHERE rt.status = 'active'
       AND h.status = 'active'
       AND rt.hotel_id <> $1
     ORDER BY rt.created_at ASC
     LIMIT 1`,
    [fixture.hotel_id]
  );
  const hotelB = secondHotel.rows[0];
  check("second hotel available for isolation", Boolean(hotelB));
  if (hotelB) {
    const bookingB = await api("POST", "/api/admin/bookings", {
      token,
      body: {
        hotel_id: hotelB.hotel_id,
        room_type_id: hotelB.room_type_id,
        guest_name: "Phase10C HotelB Notes",
        guest_email: "phase10c-notes-b@booking-selftest.invalid",
        guest_phone: "+91 98765 00013",
        check_in_date: isoDaysFromNow(72),
        check_out_date: isoDaysFromNow(73),
        booking_status: "pending",
        admin_notes: "Hotel B private note",
      },
    });
    if (bookingB.body?.data?.booking_number) {
      createdBookingNumbers.push(bookingB.body.data.booking_number);
    }
    check("hotel B create 201", bookingB.status === 201);
    await api("PATCH", `/api/admin/bookings/${notesId}`, {
      token,
      body: { admin_notes: "Hotel A private note" },
    });
    const detailA = await api("GET", `/api/admin/bookings/${notesId}`, {
      token,
    });
    const detailB = await api(
      "GET",
      `/api/admin/bookings/${bookingB.body?.data?.id}`,
      { token }
    );
    check(
      "hotel A notes isolated",
      detailA.body?.data?.admin_notes === "Hotel A private note" &&
        detailA.body?.data?.hotel_id === fixture.hotel_id
    );
    check(
      "hotel B notes isolated",
      detailB.body?.data?.admin_notes === "Hotel B private note" &&
        detailB.body?.data?.hotel_id === hotelB.hotel_id
    );
  }

  const publicReject = await api("POST", "/api/bookings", {
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Public Notes Probe",
      guest_email: "phase10c-public-notes@booking-selftest.invalid",
      guest_phone: "+91 98765 00014",
      check_in_date: isoDaysFromNow(80),
      check_out_date: isoDaysFromNow(81),
      adults: 1,
      admin_notes: "should never land",
    },
  });
  check(
    "public create rejects admin_notes",
    publicReject.status === 400,
    `got ${publicReject.status}`
  );

  const publicCreate = await api("POST", "/api/bookings", {
    body: {
      hotel_id: fixture.hotel_id,
      room_type_id: fixture.room_type_id,
      guest_name: "Public Notes Probe",
      guest_email: "phase10c-public-notes@booking-selftest.invalid",
      guest_phone: "+91 98765 00014",
      check_in_date: isoDaysFromNow(80),
      check_out_date: isoDaysFromNow(81),
      adults: 1,
      special_requests: "Public guest request",
    },
  });
  if (publicCreate.body?.data?.booking_number) {
    createdBookingNumbers.push(publicCreate.body.data.booking_number);
  }
  check("public create without admin_notes 201", publicCreate.status === 201);
  check(
    "public create response omits admin_notes",
    publicCreate.body?.data &&
      !Object.prototype.hasOwnProperty.call(publicCreate.body.data, "admin_notes")
  );

  const publicNumber = publicCreate.body?.data?.booking_number;
  if (publicNumber) {
    const adminAfterPublic = await api(
      "GET",
      `/api/admin/bookings?search=${encodeURIComponent(publicNumber)}`,
      { token }
    );
    const publicRow = (adminAfterPublic.body?.data || []).find(
      (b) => b.booking_number === publicNumber
    );
    if (publicRow?.id) {
      await api("PATCH", `/api/admin/bookings/${publicRow.id}`, {
        token,
        body: { admin_notes: "Injected after public create" },
      });
    }
    const lookup = await api(
      "GET",
      `/api/bookings/${encodeURIComponent(publicNumber)}?email=${encodeURIComponent(
        "phase10c-public-notes@booking-selftest.invalid"
      )}`
    );
    check("public lookup 200", lookup.status === 200);
    check(
      "public lookup omits admin_notes",
      lookup.body?.data &&
        !Object.prototype.hasOwnProperty.call(lookup.body.data, "admin_notes")
    );
    check(
      "public lookup keeps special_requests",
      lookup.body?.data?.special_requests === "Public guest request"
    );
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
