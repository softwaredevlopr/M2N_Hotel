require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { pool, query } = require("../config/db");

async function main() {
  const checks = [];

  const tenant = await query(
    `SELECT id, name, slug, status, plan_code, subscription_status
     FROM tenants
     WHERE slug = 'm2n-hotels'`
  );
  checks.push(["tenants default row exists", tenant.rows.length === 1]);

  const hotels = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(tenant_id)::int AS with_tenant,
            COUNT(*) FILTER (WHERE tenant_id IS NULL)::int AS null_tenant
     FROM hotels`
  );
  const hotelStats = hotels.rows[0];
  checks.push([
    "hotels.tenant_id NOT NULL on all rows",
    hotelStats.total === hotelStats.with_tenant && hotelStats.null_tenant === 0,
  ]);

  const linked = await query(
    `SELECT COUNT(*)::int AS hotels
     FROM hotels h
     INNER JOIN tenants t ON t.id = h.tenant_id
     WHERE t.slug = 'm2n-hotels'`
  );
  checks.push([
    "all hotels linked to default tenant",
    linked.rows[0].hotels === hotelStats.total,
  ]);

  const admins = await query(
    `SELECT COUNT(*)::int AS active_admins FROM admin_users WHERE is_active = TRUE`
  );
  const memberships = await query(
    `SELECT COUNT(*)::int AS memberships
     FROM tenant_memberships tm
     INNER JOIN tenants t ON t.id = tm.tenant_id
     WHERE t.slug = 'm2n-hotels'
       AND tm.is_active = TRUE
       AND tm.membership_role = 'owner'`
  );
  checks.push([
    "owner memberships for all active admins",
    memberships.rows[0].memberships === admins.rows[0].active_admins,
  ]);

  const tables = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM bookings) AS bookings,
       (SELECT COUNT(*)::int FROM booking_payments) AS booking_payments,
       (SELECT COUNT(*)::int FROM booking_invoices) AS booking_invoices,
       (SELECT COUNT(*)::int FROM room_types) AS room_types,
       (SELECT COUNT(*)::int FROM inquiries) AS inquiries`
  );
  checks.push(["operational tables readable", tables.rows.length === 1]);

  const schema = await query(
    `SELECT
       to_regclass('public.tenants') IS NOT NULL AS tenants_table,
       to_regclass('public.tenant_memberships') IS NOT NULL AS memberships_table,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'hotels'
           AND column_name = 'tenant_id'
           AND is_nullable = 'NO'
       ) AS hotels_tenant_id_not_null`
  );
  const s = schema.rows[0];
  checks.push(["tenants table created", s.tenants_table]);
  checks.push(["tenant_memberships table created", s.memberships_table]);
  checks.push(["hotels.tenant_id enforced NOT NULL", s.hotels_tenant_id_not_null]);

  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
    if (!ok) failed += 1;
  }

  console.log(`\nSchema verification: ${failed === 0 ? "PASS" : "FAIL"} (${checks.length - failed}/${checks.length})`);
  if (tables.rows[0]) {
    console.log("Row counts preserved:", tables.rows[0]);
  }

  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`Schema verification FAILED: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
