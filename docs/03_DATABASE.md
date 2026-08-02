# 03 — Database

> **Status:** Living document · **Last updated:** 2026-08-02  
> **Source of truth:** `backend/migrations/001_initial_schema.sql`, `002_admin_users.sql`, `003_tariff_rates.sql`, `004_bookings.sql`  
> **Rule:** Do not change schema without explicit approval.

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Connection](#2-connection)
- [3. Migrations](#3-migrations)
- [4. Tables](#4-tables)
- [5. Relationships](#5-relationships)
- [6. Seed data](#6-seed-data)
- [7. Encoding without new columns](#7-encoding-without-new-columns)

---

## 1. Overview

PostgreSQL with connection pooling in `backend/config/db.js`. Prefer
`DATABASE_URL` in cloud; local `DB_*` vars when URL is empty.

## 2. Connection

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Cloud connection string (preferred in prod) |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Local alternative |
| `DB_SSL` | SSL for managed providers |

Template: `backend/.env.example`. Never commit real credentials.

## 3. Migrations

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Core multi-property schema |
| `002_admin_users.sql` | Admin authentication accounts |
| `003_tariff_rates.sql` | Tariff / meal-plan rate rows (Phase 9) |
| `004_bookings.sql` | Direct reservations — bookings (Phase 10A) |

```bash
cd backend
npm run migrate
```

Shared helper: `set_updated_at()` trigger on mutable tables.

## 4. Tables

### `hotels`

Core property record. Status: `draft` \| `active` \| `inactive` \| `archived`.  
Notable columns: `slug` (unique), address fields, `check_in_time` / `check_out_time`,
`currency_code`, `star_rating`, `is_featured`, `metadata` JSONB.

### `hotel_media`

Per-hotel images/videos. `media_type`: `image` \| `video` \| `document`.  
`status`: `active` \| `inactive` \| `archived`. Featured flag: `is_cover`.  
**No category column** — admin categories encoded in URL path (see §7).

### `amenities` / `hotel_amenities`

Global amenity catalog + per-hotel links (`is_highlighted`, `notes`).

### `room_types`

Per-hotel categories. Unique `(hotel_id, slug)`. Status draft/active/inactive/archived.  
`metadata` JSONB — admin **featured** uses `metadata.is_featured`.

### `rooms`

Physical inventory. Unique `(hotel_id, room_number)`.  
Status: `available` \| `occupied` \| `maintenance` \| `blocked` \| `out_of_service`.  
Trigger enforces `room_type.hotel_id` matches `rooms.hotel_id`.

### `inquiries`

Guest booking inquiries (Phase 2). Status pipeline: pending → contacted → quoted →
confirmed / declined / cancelled.

### `tariff_rates` (Phase 9)

Per-hotel (and optional per-room-type) meal-plan rates.

| Column | Notes |
|--------|--------|
| `hotel_id` | FK → `hotels` |
| `room_type_id` | Optional FK → `room_types` (`NULL` = hotel-wide matrix) |
| `meal_plan` | `no_meal`, `breakfast`, `breakfast_one_meal`, `all_meals` |
| `occupancy` | `single`, `double` |
| `price` | Nullable — use with `display_note` when unpublished |
| `display_note` | Public note (e.g. “Available with room plan”) |
| `valid_from` / `valid_to` | Optional seasonal window |
| `status` | `active` \| `inactive` |

Hotel-level disclaimer / policies: `hotels.metadata.tariff_settings` JSON.

### `bookings` (Phase 10A, migration 004)

Direct reservations, slug/`hotel_id`-scoped for multi-property support.

| Column | Notes |
|--------|--------|
| `booking_number` | Unique human-readable reference, `M2N-YYYYMMDD-XXXXX` |
| `hotel_id` | FK → `hotels` `ON DELETE RESTRICT` |
| `room_type_id` | FK → `room_types` `ON DELETE RESTRICT` |
| `room_id` | Optional FK → `rooms` `ON DELETE SET NULL` (assigned by admin) |
| `guest_name` / `guest_email` / `guest_phone` | All required |
| `check_in_date` / `check_out_date` | `CHECK (check_out_date > check_in_date)` |
| `adults` / `children` / `number_of_rooms` | `> 0` / `>= 0` / `> 0` |
| `booking_source` | `website`, `admin`, `phone`, `walk_in`, `ota` |
| `booking_status` | `pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled`, `no_show` |
| `payment_status` | `unpaid`, `partial`, `paid`, `refunded` |
| `special_requests` | Nullable free text |
| `subtotal` / `tax_amount` / `total_amount` | `NUMERIC(12,2)`, all `>= 0` |
| `currency` | `CHAR(3)`, defaults to the hotel's `currency_code` |
| `created_by_admin_id` | Nullable FK → `admin_users` `ON DELETE SET NULL` |
| `confirmed_at` / `cancelled_at` / `cancellation_reason` | Stamped on status change |

Statuses and sources are `VARCHAR` + `CHECK` constraints, matching the existing
project convention (no native PostgreSQL enums). Mirrored in
`backend/utils/bookingConstants.js` — keep both in sync.

**Availability** is derived, not stored. Sellable inventory is the count of
`rooms` for the room type with status `available` or `occupied`; committed
inventory is the busiest single night across the requested stay among bookings
in `pending`, `confirmed`, or `checked_in`. A partial index
(`idx_bookings_availability`) covers that lookup. See
[ADR-0014](history/DECISIONS.md).

### `admin_users` (migration 002)

| Column | Notes |
|--------|-------|
| `email` | Unique, normalized lowercase |
| `password_hash` | bcrypt only — never returned by API |
| `role` | `super_admin` \| `hotel_admin` |
| `is_active` | Soft disable |

## 5. Relationships

```
hotels 1──* hotel_media
hotels 1──* hotel_amenities *──1 amenities
hotels 1──* room_types 1──* rooms
hotels 1──* inquiries (optional room_type_id)
hotels 1──* bookings *──1 room_types (optional room_id, optional created_by_admin_id)
hotels 1──* tariff_rates (optional room_type_id)
admin_users (standalone auth)
```

## 6. Seed data

| Script | Command | Purpose |
|--------|---------|---------|
| `scripts/seed.js` | `npm run seed` | Hotels, amenities, media, room types, rooms |
| `scripts/seedAdmin.js` | `npm run seed:admin` | First super admin (`ADMIN_*` env) |
| `scripts/testBookings.js` | `npm run test:bookings` | Dev smoke test for the booking APIs; deletes every booking it creates |

`bookings` is transactional data and is intentionally **not** seeded — reference
data only.

## 7. Encoding without new columns

| Need | Approach |
|------|----------|
| Room type featured | `room_types.metadata.is_featured` |
| Media category | URL path `/uploads/hotels/{id}/{Category}/…` |
| Room activate/deactivate | `available` / `out_of_service` |
