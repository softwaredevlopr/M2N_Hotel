/**
 * Phase 14 Lite — manual payment ledger + invoice draft/issue/void APIs.
 * Server must be running on :5001. Requires migration 008 applied.
 *
 * Usage: node scripts/verifyPhase14.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");
const { signAdminToken } = require("../utils/adminAuth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";
const EMAIL_SUFFIX = "@phase14-selftest.invalid";

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

async function cleanupSelftestRows() {
  const bookings = await query(
    `SELECT id, booking_number FROM bookings WHERE guest_email ILIKE $1`,
    [`%${EMAIL_SUFFIX}`]
  );
  for (const row of bookings.rows) {
    await query(`DELETE FROM booking_payments WHERE booking_id = $1`, [row.id]);
    await query(`DELETE FROM booking_invoices WHERE booking_id = $1`, [row.id]);
  }
  const deleted = await query(
    `DELETE FROM bookings WHERE guest_email ILIKE $1 RETURNING booking_number`,
    [`%${EMAIL_SUFFIX}`]
  );
  return deleted.rows.length;
}

async function cleanup() {
  const count = await cleanupSelftestRows();
  if (count > 0) {
    console.log(`\nCleaned up ${count} verification booking(s).`);
  }
}

async function main() {
  const health = await api("GET", "/health");
  check(
    "backend health",
    health.status === 200 && health.body?.status === "healthy"
  );

  const tables = await query(
    `SELECT to_regclass('public.booking_payments') IS NOT NULL AS payments,
            to_regclass('public.booking_invoices') IS NOT NULL AS invoices`
  );
  check("migration 008 tables exist", tables.rows[0]?.payments && tables.rows[0]?.invoices);

  const adminResult = await query(
    `SELECT id, email FROM admin_users WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1`
  );
  const admin = adminResult.rows[0];
  check("active admin exists", Boolean(admin));
  if (!admin) throw new Error("No admin — run npm run seed:admin");

  const types = await query(
    `SELECT rt.id AS room_type_id, rt.hotel_id, h.slug AS hotel_slug
     FROM room_types rt
     INNER JOIN hotels h ON h.id = rt.hotel_id
     WHERE rt.status = 'active' AND h.status = 'active'
     ORDER BY rt.created_at ASC`
  );
  const hotelA = types.rows[0];
  const hotelB = types.rows.find((row) => row.hotel_id !== hotelA.hotel_id);
  check("hotel A fixture", Boolean(hotelA));
  check("hotel B fixture", Boolean(hotelB));
  if (!hotelA || !hotelB) throw new Error("Need two hotels");

  await cleanupSelftestRows();

  const token = signAdminToken(admin);
  const guestEmail = `phase14-selftest${EMAIL_SUFFIX}`;

  section("Create booking fixture");
  const createBooking = await api("POST", "/api/admin/bookings", {
    token,
    body: {
      hotel_id: hotelA.hotel_id,
      room_type_id: hotelA.room_type_id,
      guest_name: "Phase14 Selftest Guest",
      guest_email: guestEmail,
      guest_phone: "+91 98765 01400",
      check_in_date: isoDaysFromNow(120),
      check_out_date: isoDaysFromNow(122),
      booking_status: "confirmed",
      subtotal: 2000,
      tax_amount: 100,
      total_amount: 2100,
    },
  });
  check("create booking 201", createBooking.status === 201);
  const bookingId = createBooking.body?.data?.id;
  const bookingNumber = createBooking.body?.data?.booking_number;
  if (bookingNumber) createdBookingNumbers.push(bookingNumber);
  check("booking id returned", Boolean(bookingId));
  check(
    "booking starts unpaid",
    createBooking.body?.data?.payment_status === "unpaid"
  );

  const q = (path, opts = {}) =>
    api(path.method || "GET", path.path || path, {
      token,
      ...opts,
      ...(path.body ? { body: path.body } : {}),
    });

  section("Payment auth + validation");
  const unauth = await api(
    "GET",
    `/api/admin/bookings/${bookingId}/payments?hotel_id=${hotelA.hotel_id}`
  );
  check("payments require auth", unauth.status === 401);

  const badHotel = await api(
    "GET",
    `/api/admin/bookings/${bookingId}/payments?hotel_id=not-a-uuid`,
    { token }
  );
  check("invalid hotel_id 400", badHotel.status === 400);

  section("Payment ledger — partial → paid");
  const pay1 = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/payments?hotel_id=${hotelA.hotel_id}`,
    {
      token,
      body: {
        entry_type: "payment",
        payment_method: "cash",
        amount: 1000,
        reference_code: "CASH-001",
        idempotency_key: "phase14-pay-1",
      },
    }
  );
  check("record payment 201", pay1.status === 201);
  check("payment status partial", pay1.body?.payment_status === "partial");
  check("net_paid 1000", pay1.body?.net_paid === 1000);

  const payDup = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/payments?hotel_id=${hotelA.hotel_id}`,
    {
      token,
      body: {
        entry_type: "payment",
        payment_method: "cash",
        amount: 1000,
        idempotency_key: "phase14-pay-1",
      },
    }
  );
  check("idempotent replay 200", payDup.status === 200);
  check("same payment id", payDup.body?.data?.id === pay1.body?.data?.id);

  const pay2 = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/payments?hotel_id=${hotelA.hotel_id}`,
    {
      token,
      body: {
        entry_type: "payment",
        payment_method: "upi",
        amount: 1100,
        reference_code: "UPI-002",
      },
    }
  );
  check("second payment 201", pay2.status === 201);
  check("payment status paid", pay2.body?.payment_status === "paid");

  const listPay = await api(
    "GET",
    `/api/admin/bookings/${bookingId}/payments?hotel_id=${hotelA.hotel_id}`,
    { token }
  );
  check("list payments 200", listPay.status === 200);
  check("ledger has 2 active payments", listPay.body?.data?.length === 2);
  check("summary net_paid 2100", listPay.body?.summary?.net_paid === 2100);

  section("Refund + void behavior");
  const overRefund = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/payments?hotel_id=${hotelA.hotel_id}`,
    {
      token,
      body: {
        entry_type: "refund",
        payment_method: "cash",
        amount: 5000,
      },
    }
  );
  check("refund over limit 400", overRefund.status === 400);

  const refund = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/payments?hotel_id=${hotelA.hotel_id}`,
    {
      token,
      body: {
        entry_type: "refund",
        payment_method: "cash",
        amount: 500,
      },
    }
  );
  check("partial refund 201", refund.status === 201);
  check("status partial after refund", refund.body?.payment_status === "partial");

  const voidPay = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/payments/${pay1.body?.data?.id}/void?hotel_id=${hotelA.hotel_id}`,
    {
      token,
      body: { void_reason: "Duplicate cash entry" },
    }
  );
  check("void payment 200", voidPay.status === 200);
  check(
    "voided entry excluded from net",
    voidPay.body?.net_paid === 1100 - 500
  );

  const fullRefund = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/payments?hotel_id=${hotelA.hotel_id}`,
    {
      token,
      body: {
        entry_type: "refund",
        payment_method: "cash",
        amount: 600,
      },
    }
  );
  check("full refund remainder 201", fullRefund.status === 201);
  check(
    "payment status refunded when net zero",
    fullRefund.body?.payment_status === "refunded"
  );

  section("Invoice draft / issue / void");
  const draft = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/invoices?hotel_id=${hotelA.hotel_id}`,
    {
      token,
      body: { notes: "Phase14 draft" },
    }
  );
  check("create draft 201", draft.status === 201);
  check("draft status", draft.body?.data?.status === "draft");
  check(
    "draft placeholder number",
    String(draft.body?.data?.invoice_number || "").startsWith("DRAFT-")
  );
  const invoiceId = draft.body?.data?.id;

  const issue = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/invoices/${invoiceId}/issue?hotel_id=${hotelA.hotel_id}`,
    { token, body: {} }
  );
  check("issue invoice 200", issue.status === 200);
  check("issued status", issue.body?.data?.status === "issued");
  check(
    "invoice number format",
    /-[0-9]{4}-[0-9]{6}$/.test(issue.body?.data?.invoice_number || "")
  );
  check(
    "issued snapshot total",
    Number(issue.body?.data?.total_amount) === 2100
  );

  const issueDup = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/invoices/${invoiceId}/issue?hotel_id=${hotelA.hotel_id}`,
    { token, body: {} }
  );
  check("idempotent issue 200", issueDup.status === 200);

  const draft2 = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/invoices?hotel_id=${hotelA.hotel_id}`,
    { token, body: {} }
  );
  check(
    "second issue blocked while one active",
    draft2.status === 201 &&
      (await api(
        "POST",
        `/api/admin/bookings/${bookingId}/invoices/${draft2.body?.data?.id}/issue?hotel_id=${hotelA.hotel_id}`,
        { token, body: {} }
      )).status === 409
  );

  const voidInv = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/invoices/${invoiceId}/void?hotel_id=${hotelA.hotel_id}`,
    {
      token,
      body: { void_reason: "Reissue with corrected buyer GSTIN" },
    }
  );
  check("void issued invoice 200", voidInv.status === 200);
  check("invoice void status", voidInv.body?.data?.status === "void");

  const reissueDraft = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/invoices?hotel_id=${hotelA.hotel_id}`,
    {
      token,
      body: { replaces_invoice_id: invoiceId },
    }
  );
  check("reissue draft 201", reissueDraft.status === 201);
  check(
    "replaces void invoice",
    reissueDraft.body?.data?.replaces_invoice_id === invoiceId
  );

  const reissue = await api(
    "POST",
    `/api/admin/bookings/${bookingId}/invoices/${reissueDraft.body?.data?.id}/issue?hotel_id=${hotelA.hotel_id}`,
    { token, body: {} }
  );
  check("reissue issue 200", reissue.status === 200);
  check(
    "new invoice number after void",
    reissue.body?.data?.invoice_number !== issue.body?.data?.invoice_number
  );

  section("Hotel isolation");
  const crossHotel = await api(
    "GET",
    `/api/admin/bookings/${bookingId}/payments?hotel_id=${hotelB.hotel_id}`,
    { token }
  );
  check("cross-hotel list 404", crossHotel.status === 404);

  section("Summary");
  console.log(`\nPhase 14 verification: ${passed} passed, ${failed} failed`);
  await cleanup();
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error("Fatal:", error.message);
  await cleanup().catch(() => {});
  await pool.end().catch(() => {});
  process.exit(1);
});
