# Database Migrations

SQL migrations for the M2N Hotels PostgreSQL database.

## Files

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Hotels, media, amenities, room types, rooms, inquiries |
| `002_admin_users.sql` | Admin authentication accounts |
| `003_tariff_rates.sql` | Tariff / meal-plan rate rows (Phase 9) |
| `004_bookings.sql` | Direct reservations — bookings table (Phase 10A) |
| `005_room_type_inventory_dates.sql` | Per-night stop-sell / allotment / overbooking (Phase 10I) |
| `006_booking_admin_notes.sql` | Private staff notes — `bookings.admin_notes` |
| `007_booking_notification_preferences.sql` | Guest channel prefs on `bookings` |
| `008_booking_payments_and_invoices.sql` | Phase 14 payment ledger + invoice snapshots |
| `009_tenancy_lite.sql` | Phase 15 Lite — `tenants`, `tenant_memberships`, `hotels.tenant_id` |

## Run

```bash
cd backend
npm run migrate
```

Requires a configured `.env` (`DATABASE_URL` or `DB_*`). See
[`docs/03_DATABASE.md`](../docs/03_DATABASE.md) and
[`docs/06_SETUP_GUIDE.md`](../docs/06_SETUP_GUIDE.md).

**Do not** edit applied migrations in place for production history — add a new
numbered file after approval (schema changes require explicit approval per
`AGENTS.md`).
