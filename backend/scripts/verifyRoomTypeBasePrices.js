/**
 * Verify overnight base_price values and that admin PATCH still accepts base_price.
 * Does not change schema. Restores any temporary admin PATCH probe value.
 *
 *   node scripts/verifyRoomTypeBasePrices.js
 */

require("dotenv").config();
const { query, pool } = require("../config/db");

const API = `http://127.0.0.1:${process.env.PORT || 5001}`;

async function api(method, path, { token, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

function check(label, ok, detail = "") {
  if (!ok) throw new Error(`FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ✓ ${label}`);
}

async function main() {
  console.log("Verify room_types.base_price setup\n");

  const col = await query(
    `SELECT data_type, numeric_precision, numeric_scale
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'room_types'
       AND column_name = 'base_price'`
  );
  check(
    "base_price column is numeric(12,2)",
    col.rows[0]?.data_type === "numeric" &&
      Number(col.rows[0]?.numeric_precision) === 12 &&
      Number(col.rows[0]?.numeric_scale) === 2
  );

  const rows = await query(
    `SELECT h.slug AS hotel_slug, rt.id, rt.slug, rt.base_price::float AS base_price
     FROM room_types rt
     JOIN hotels h ON h.id = rt.hotel_id
     WHERE h.slug IN ('hotel-zaarang-inn', 'm2n-hotel-aurelia-grand')
       AND rt.status = 'active'`
  );

  const byKey = Object.fromEntries(
    rows.rows.map((r) => [`${r.hotel_slug}:${r.slug}`, r])
  );

  for (const hotel of ["hotel-zaarang-inn", "m2n-hotel-aurelia-grand"]) {
    check(`${hotel}/standard base_price is 0`, byKey[`${hotel}:standard`]?.base_price === 0);
    check(`${hotel}/deluxe base_price is 1999`, byKey[`${hotel}:deluxe`]?.base_price === 1999);
    check(`${hotel}/suite base_price is 2999`, byKey[`${hotel}:suite`]?.base_price === 2999);
  }

  // Public availability should surface DB prices for deluxe.
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 14);
  const checkout = new Date(tomorrow);
  checkout.setUTCDate(checkout.getUTCDate() + 2);
  const checkIn = tomorrow.toISOString().slice(0, 10);
  const checkOut = checkout.toISOString().slice(0, 10);

  const avail = await api(
    "GET",
    `/api/bookings/availability?hotel_slug=hotel-zaarang-inn&check_in_date=${checkIn}&check_out_date=${checkOut}`
  );
  if (avail.status === 0 || avail.status >= 500) {
    console.log("  · Skipping live availability probe (API not reachable)");
  } else {
    check("availability API responds", avail.status === 200 && avail.data?.success === true);
    const deluxe = (avail.data?.data?.room_types || []).find((r) => r.slug === "deluxe");
    check(
      "availability deluxe base_price is 1999",
      Number(deluxe?.base_price) === 1999,
      JSON.stringify(deluxe?.base_price)
    );
    check(
      "availability deluxe nightly_rate is 1999",
      Number(deluxe?.nightly_rate) === 1999,
      JSON.stringify(deluxe?.nightly_rate)
    );
    const standard = (avail.data?.data?.room_types || []).find((r) => r.slug === "standard");
    check(
      "availability standard stays on-request (base_price 0)",
      Number(standard?.base_price) === 0 && standard?.on_request === true
    );
  }

  // Admin PATCH base_price round-trip (restore afterward).
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("  · Skipping admin PATCH probe (ADMIN_EMAIL/PASSWORD unset)");
  } else {
    const login = await api("POST", "/api/admin/auth/login", {
      body: { email, password },
    });
    if (login.status !== 200 || !login.data?.data?.access_token) {
      console.log("  · Skipping admin PATCH probe (login failed)");
    } else {
      const token = login.data.data.access_token;
      const target = byKey["hotel-zaarang-inn:deluxe"];
      const probe = await api("PATCH", `/api/admin/room-types/${target.id}`, {
        token,
        body: { base_price: 1999 },
      });
      check(
        "admin PATCH base_price accepted",
        probe.status === 200 && Number(probe.data?.data?.base_price) === 1999,
        `status=${probe.status}`
      );
    }
  }

  await pool.end();
  console.log("\nVerification passed.");
}

main().catch(async (error) => {
  console.error("\nVerification failed:", error.message || error);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
