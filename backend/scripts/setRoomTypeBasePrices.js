/**
 * Operational: set overnight room_types.base_price for Deluxe / Suite.
 * Standard stays 0.00 — the ₹999 Couple / Get Together Package is a 3-hour
 * package (tariff/package metadata), not a per-night base price.
 *
 * No schema changes. Idempotent.
 *
 *   node scripts/setRoomTypeBasePrices.js
 */

require("dotenv").config();
const { query, pool } = require("../config/db");

const TARGETS = [
  { hotel_slug: "hotel-zaarang-inn", room_slug: "deluxe", base_price: 1999 },
  { hotel_slug: "hotel-zaarang-inn", room_slug: "suite", base_price: 2999 },
  { hotel_slug: "m2n-hotel-aurelia-grand", room_slug: "deluxe", base_price: 1999 },
  { hotel_slug: "m2n-hotel-aurelia-grand", room_slug: "suite", base_price: 2999 },
];

async function main() {
  console.log("=== BEFORE ===");
  const before = await query(
    `SELECT h.slug AS hotel_slug, rt.slug, rt.name, rt.status, rt.base_price
     FROM room_types rt
     JOIN hotels h ON h.id = rt.hotel_id
     WHERE h.slug IN ('hotel-zaarang-inn', 'm2n-hotel-aurelia-grand')
       AND rt.status = 'active'
     ORDER BY h.name, rt.sort_order`
  );
  console.table(
    before.rows.map((r) => ({
      hotel: r.hotel_slug,
      room: r.slug,
      status: r.status,
      base_price: r.base_price,
    }))
  );

  for (const target of TARGETS) {
    const result = await query(
      `UPDATE room_types rt
       SET base_price = $1
       FROM hotels h
       WHERE rt.hotel_id = h.id
         AND h.slug = $2
         AND rt.slug = $3
         AND rt.status = 'active'
       RETURNING rt.id, h.slug AS hotel_slug, rt.slug, rt.base_price`,
      [target.base_price, target.hotel_slug, target.room_slug]
    );
    if (result.rows.length === 0) {
      throw new Error(
        `No active room type updated for ${target.hotel_slug}/${target.room_slug}`
      );
    }
    console.log(
      `Updated ${result.rows[0].hotel_slug}/${result.rows[0].slug} → ${result.rows[0].base_price}`
    );
  }

  // Explicitly keep Standard at 0 so overnight booking stays on-request.
  await query(
    `UPDATE room_types rt
     SET base_price = 0
     FROM hotels h
     WHERE rt.hotel_id = h.id
       AND h.slug IN ('hotel-zaarang-inn', 'm2n-hotel-aurelia-grand')
       AND rt.slug = 'standard'`
  );
  console.log("Confirmed Standard base_price remains 0.00 (package, not nightly).");

  console.log("\n=== AFTER ===");
  const after = await query(
    `SELECT h.slug AS hotel_slug, rt.slug, rt.name, rt.status, rt.base_price
     FROM room_types rt
     JOIN hotels h ON h.id = rt.hotel_id
     WHERE h.slug IN ('hotel-zaarang-inn', 'm2n-hotel-aurelia-grand')
       AND rt.status = 'active'
     ORDER BY h.name, rt.sort_order`
  );
  console.table(
    after.rows.map((r) => ({
      hotel: r.hotel_slug,
      room: r.slug,
      status: r.status,
      base_price: r.base_price,
    }))
  );

  await pool.end();
  console.log("\nDone. No schema changes.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
