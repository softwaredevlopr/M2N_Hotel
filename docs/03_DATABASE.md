# 03 — Database

> **Status:** Living document · **Last updated:** 2026-09-03  
> **Source of truth:** `backend/migrations/001_initial_schema.sql` …
> `009_tenancy_lite.sql` (+ runtime `schema_migrations` from the migrate runner)  
> **Rule:** Do not change schema without explicit approval. Do not invent columns.

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Connection](#2-connection)
- [3. Migrations](#3-migrations)
- [4. Tables](#4-tables)
- [5. Relationships](#5-relationships)
- [6. Seed data](#6-seed-data)
- [7. Encoding without new columns](#7-encoding-without-new-columns)
- [8. Schema caveats](#8-schema-caveats)

---

## 1. Overview

PostgreSQL with connection pooling in `backend/config/db.js`. Prefer
`DATABASE_URL` in cloud; local `DB_*` vars when URL is empty.

## 2. Connection

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Cloud connection string (preferred in prod/staging) |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Local alternative |
| `DB_SSL` / pool timeouts | Managed providers / tuning |

Template: `backend/.env.example`. Never commit real credentials.

## 3. Migrations

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Core multi-property schema |
| `002_admin_users.sql` | Admin authentication accounts |
| `003_tariff_rates.sql` | Tariff / meal-plan rate rows (Phase 9) |
| `004_bookings.sql` | Direct reservations — bookings (Phase 10A) |
| `005_room_type_inventory_dates.sql` | Per-night stop-sell / allotment / overbooking (Phase 10I) |
| `006_booking_admin_notes.sql` | Private staff notes on bookings |
| `007_booking_notification_preferences.sql` | Guest channel prefs JSONB (Phase 11) |
| `008_booking_payments_and_invoices.sql` | Manual payment ledger + invoices (Phase 14 Lite) |
| `009_tenancy_lite.sql` | `tenants`, `tenant_memberships`, `hotels.tenant_id` (Phase 15 Lite) |

Runtime table **`schema_migrations`** (`filename`, `executed_at`) is created by
`scripts/runMigrations.js`. Runner skips already-recorded files; each new file
runs in a transaction.

```bash
cd backend
npm run migrate
```

Shared helper: `set_updated_at()` trigger on mutable tables.

## 4. Tables

### `schema_migrations`

Tracks applied SQL filenames. Do not manually insert rows without executing SQL.

### `hotels`

Core property record. Status: `draft` \| `active` \| `inactive` \| `archived`.  
Notable columns: `slug` (unique), address fields, `check_in_time` / `check_out_time`,
`currency_code`, `star_rating`, `is_featured`, `metadata` JSONB,
**`tenant_id` UUID NOT NULL** (migration `009`, FK → `tenants`).

### `hotel_media`

Per-hotel images/videos. `media_type`: `image` \| `video` \| `document`.  
`status`: `active` \| `inactive` \| `archived`. Featured flag: `is_cover`.  
**No category column** — admin categories encoded in URL path (see §7).

### `amenities` / `hotel_amenities`

Global amenity catalog + per-hotel links (`is_highlighted`, `notes`).

### `room_types`

Per-hotel categories. Unique `(hotel_id, slug)`. Status draft/active/inactive/archived.  
Important columns: **`base_price`**, **`max_occupancy`** (NOT `max_adults` /
`max_children`), `bed_type`, `room_size_sqft`, `metadata` JSONB
(`metadata.is_featured` for admin featured).

### `rooms`

Physical inventory. Unique `(hotel_id, room_number)`.  
**`floor_label`** `VARCHAR(30)` — free-text label (e.g. `"1st Floor"`), **not**
an integer `floor` column.  
Status: `available` \| `occupied` \| `maintenance` \| `blocked` \| `out_of_service`.  
Trigger enforces `room_type.hotel_id` matches `rooms.hotel_id`.

### `inquiries`

Guest booking inquiries (Phase 2). Status pipeline: pending → contacted → quoted →
confirmed / declined / cancelled.

### `admin_users` (migration 002)

| Column | Notes |
|--------|-------|
| `email` | Unique, normalized lowercase |
| `password_hash` | bcrypt only — never returned by API |
| `role` | `super_admin` \| `hotel_admin` |
| `is_active` | Soft disable |

### `tenants` / `tenant_memberships` (Phase 15 Lite, migration 009)

**`tenants`:** operator / SaaS account — `name`, unique `slug`, `status`
(`trial`\|`active`\|`suspended`\|`cancelled`), `billing_email`, `plan_code`,
`subscription_status` (`trialing`\|`active`\|`past_due`\|`cancelled`),
`trial_ends_at`, `current_period_end`, `metadata`.

**`tenant_memberships`:** `(tenant_id, admin_user_id)` unique;
`membership_role` `owner` \| `admin` \| `staff`; `is_active`. Lite AuthZ grants
access to **all hotels** under the tenant; **`membership_role` is not used for
endpoint RBAC** today.

Default backfill tenant slug: **`m2n-hotels`**.

### `tariff_rates` (Phase 9)

Per-hotel (and optional per-room-type) meal-plan rates: `meal_plan`, `occupancy`
(`single`\|`double`), `price`, `display_note`, validity window, `status`.

Hotel-level disclaimer / policies: `hotels.metadata.tariff_settings` JSON.

### `bookings` (Phase 10A, migration 004)

Direct reservations, `hotel_id`-scoped. Key columns: `booking_number`, guest
fields, stay dates, adults/children/`number_of_rooms`, `booking_source`,
`booking_status`, `payment_status`, amounts, `created_by_admin_id`,
`admin_notes` (`006`), `notification_preferences` JSONB (`007`).

**No `guests` table** — CRM Lite derives identity from bookings + inquiries.

**Availability:** physical sellable rooms minus blocking bookings; optional
sparse overrides in `room_type_inventory_dates`.

### `room_type_inventory_dates` (Phase 10I, migration 005)

Sparse per-hotel / room-type / night overrides (`allotment`, `stop_sell`,
`overbooking_allowance`, `source`). Unique `(hotel_id, room_type_id, inventory_date)`.

### `hotel_invoice_sequences` / `booking_invoices` / `booking_payments` (Phase 14 Lite, migration 008)

Manual ledger + draft/issue/void invoices. Optional `external_*` columns exist
for a **future** gateway — **unused**. See [ADR-0041](history/DECISIONS.md).

## 5. Relationships

```
tenants 1──* tenant_memberships *──1 admin_users
tenants 1──* hotels
hotels 1──* hotel_media
hotels 1──* hotel_amenities *──1 amenities
hotels 1──* room_types 1──* rooms
hotels 1──* inquiries (optional room_type_id)
hotels 1──* bookings *──1 room_types (optional room_id, optional created_by_admin_id)
hotels 1──* booking_payments *──1 bookings
hotels 1──* booking_invoices *──1 bookings
hotels 1──* hotel_invoice_sequences
hotels 1──* tariff_rates (optional room_type_id)
hotels 1──* room_type_inventory_dates *──1 room_types
```

Hotel-scoped operational tables keep **`hotel_id`**. Tenant isolation path:
`row.hotel_id → hotels.tenant_id → tenant_memberships`.

## 6. Seed data

| Script | Command | Purpose |
|--------|---------|---------|
| `scripts/seed.js` | `npm run seed` | Hotels, amenities, media, room types, rooms, tariff matrix |
| `scripts/seedAdmin.js` | `npm run seed:admin` | First `super_admin` (`ADMIN_*`) + `owner` membership on `m2n-hotels` |

### Phase 15 tenancy compatibility (commit `be2351a`)

Migrations **`001`–`009` may be fully applied before seeding.**

**`npm run seed`:**
- Resolves existing tenant slug `m2n-hotels` (does **not** create tenants).
- Sets `tenant_id` on hotel **INSERT** only; reruns do **not** overwrite
  existing hotels’ `tenant_id`.
- Fails fast if `m2n-hotels` is missing.

**`npm run seed:admin`:**
- Creates/uses configured `super_admin`; skips duplicate email.
- Ensures `owner` membership on `m2n-hotels` (`ON CONFLICT DO NOTHING`).
- Does not silently reactivate inactive admins or memberships.

Confirm DB target before writes. Placeholders only in docs — never real secrets.
See [ADR-0043](history/DECISIONS.md).

## 7. Encoding without new columns

| Need | Approach |
|------|----------|
| Room type featured | `room_types.metadata.is_featured` |
| Media category | URL path `/uploads/hotels/{id}/{Category}/…` |
| Room activate/deactivate | `available` / `out_of_service` |
| CRM guest 360 | Derived from `bookings` + `inquiries` (no guests table) |
| Seller GSTIN / invoice prefix | `hotels.metadata.billing.*` / `metadata.invoice_prefix` |

## 8. Schema caveats

- Use **`max_occupancy`** on `room_types` — do not invent `max_adults` /
  `max_children` columns.
- Use **`floor_label`** on `rooms` — do not invent a `floor` integer column.
- Do not invent a `guests` table — CRM Lite is derived.
- Do not mark payment gateway as implemented — ledger only.
