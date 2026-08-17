# 04 — API Reference

> **Status:** Living document · **Last updated:** 2026-08-16  
> **Base URL (local):** `http://localhost:5001`  
> **Frontend env:** `NEXT_PUBLIC_API_URL`

---

## Table of Contents

- [1. Conventions](#1-conventions)
- [2. Endpoint index](#2-endpoint-index)
- [3. Public APIs](#3-public-apis)
- [4. Admin authentication](#4-admin-authentication)
- [5. Admin hotels](#5-admin-hotels)
- [6. Admin room types](#6-admin-room-types)
- [7. Admin rooms](#7-admin-rooms)
- [8. Admin media](#8-admin-media)
- [9. Tariffs (Phase 9)](#9-tariffs-phase-9)
- [10. Bookings (Phase 10A)](#10-bookings-phase-10a)
- [11. Admin guests (Phase 13 CRM Lite)](#11-admin-guests-phase-13-crm-lite)
- [12. Errors & security](#12-errors--security)

---

## 1. Conventions

- JSON responses; success shape typically `{ success: true, … }`.
- Admin routes require `Authorization: Bearer <access_token>`.
- Rate limits: `/api` 300/15min; `POST /api/inquiries` and `POST /api/bookings`
  20/15min (override with `WRITE_RATE_LIMIT_MAX`); `GET /api/bookings/:number`
  60/15min (`BOOKING_LOOKUP_RATE_LIMIT_MAX`); `POST /api/admin/auth/login` 20/15min.
- JSON/urlencoded body size: 100kb (multipart uploads use Multer, max 5MB images).

## 2. Endpoint index

| Method | Path | Auth | Phase |
|--------|------|------|-------|
| `GET` | `/` | Public | — |
| `GET` | `/health` | Public | — |
| `GET` | `/api/hotels` | Public | 1 |
| `GET` | `/api/hotels/:slug` | Public | 1 |
| `GET` | `/api/rooms/types` | Public | 1 |
| `GET` | `/api/rooms/types/:slug` | Public | 1 |
| `GET` | `/api/rooms` | Public | 1 |
| `GET` | `/api/rooms/:id` | Public | 1 |
| `POST` | `/api/inquiries` | Public | 2 |
| `GET` | `/api/inquiries` | JWT | 2/10H |
| `GET` | `/api/inquiries/:id` | JWT | 2/10H |
| `PATCH` | `/api/inquiries/:id/status` | JWT | 2/10H |
| `DELETE` | `/api/inquiries/:id` | JWT | 10H |
| `POST` | `/api/admin/auth/login` | — | 3 |
| `GET` | `/api/admin/auth/me` | JWT | 3 |
| `CRUD` | `/api/admin/hotels` | JWT | 4 |
| `CRUD` | `/api/admin/room-types` | JWT | 5 |
| `CRUD` | `/api/admin/rooms` | JWT | 6 |
| `CRUD` + upload | `/api/admin/media` | JWT | 7 |
| `GET` | `/api/tariffs?hotel_slug=` | Public | 9 |
| `CRUD` | `/api/admin/tariffs` | JWT | 9 |
| `GET/PATCH` | `/api/admin/tariffs/settings/:hotelId` | JWT | 9 |
| `POST` | `/api/bookings` | Public | 10A |
| `GET` | `/api/bookings/availability` | Public | 10B |
| `GET` | `/api/bookings/availability/calendar` | Public | 10D |
| `GET` | `/api/bookings/:bookingNumber` | Public + contact check | 10A |
| `POST` | `/api/bookings/:bookingNumber/cancel` | Public + contact check | 11 |
| `POST` | `/api/bookings/:bookingNumber/modify` | Public + contact check | 11 |
| `POST` | `/api/bookings/:bookingNumber/modify/preview` | Public + contact check | 11 |
| `POST` | `/api/bookings/:bookingNumber/notification-preferences` | Public + contact check | 11 |
| `GET` | `/api/admin/bookings` | JWT | 10A/10C |
| `GET` | `/api/admin/bookings/stats` | JWT | 10C / 12 |
| `POST` | `/api/admin/bookings` | JWT | 10A |
| `GET` | `/api/admin/bookings/:id` | JWT | 10A |
| `PATCH` | `/api/admin/bookings/:id` | JWT | 10A |
| `POST` | `/api/admin/bookings/:id/cancel` | JWT | 11 |
| `PATCH` | `/api/admin/bookings/:id/status` | JWT | 10A |
| `PATCH` | `/api/admin/bookings/:id/assign-room` | JWT | 10A |
| `GET` | `/api/admin/inventory/calendar` | JWT | 10D |
| `GET` | `/api/admin/inventory/day` | JWT | 10D |
| `GET` | `/api/admin/inventory/overlaps` | JWT | 10D |
| `PUT` | `/api/admin/inventory/dates` | JWT | 10I write |
| `DELETE` | `/api/admin/inventory/dates` | JWT | 10I write |
| `GET` | `/api/admin/guests` | JWT | 13 |
| `GET` | `/api/admin/guests/profile` | JWT | 13 |

Static files: `GET /uploads/...` (admin-uploaded media).

## 3. Public APIs

### Hotels

- `GET /api/hotels` — list (default `status=active`; `limit`/`offset`)
- `GET /api/hotels/:slug` — detail including **active** `media` and amenities

### Rooms

- `GET /api/rooms/types` — optional `?hotel_slug=` `&status=` (default active types)
- `GET /api/rooms/types/:slug`
- `GET /api/rooms` — optional `hotel_slug`, `room_type_slug`, `status`
- `GET /api/rooms/:id`

### Inquiries (Phase 2 / 10H)

- `POST /api/inquiries` — public create (validated; rate-limited). Guest form.
- `GET /api/inquiries` — JWT. Query: `q` (name/email/phone), `status`,
  `hotel_id`, `hotel_slug`, `limit`, `offset`. Returns `data`, `total`, `count`.
- `GET /api/inquiries/:id` — JWT.
- `PATCH /api/inquiries/:id/status` — JWT. Body: `{ status, admin_notes? }`.
- `DELETE /api/inquiries/:id` — JWT. Consumed by `/admin/inquiries`.

Statuses: `pending`, `contacted`, `quoted`, `confirmed`, `declined`, `cancelled`.

### Tariffs (Phase 9)

- `GET /api/tariffs?hotel_slug=` — active meal-plan matrix for an active hotel.
  Optional `room_type_id` for scoped resolution. Returns `mealPlans[]` (single/double
  rates or `singleNote`/`doubleNote`), plus hotel-level settings from
  `hotels.metadata.tariff_settings` (disclaimer, extra bed, GST, cancellation).

### Bookings (Phase 10A / 10B / 10D)

- `GET /api/bookings/availability` — stay-window inventory + indicative amounts
  (Phase 10B UI Step 2).
- `GET /api/bookings/availability/calendar` — per-day sold/remaining calendar for
  a hotel (Phase 10D; future widgets). Does not replace the stay-window route.
- `POST /api/bookings` — create a reservation request (availability checked).
- `GET /api/bookings/:bookingNumber?email=` — guest lookup, contact-verified.
  Backs the `/booking/[bookingNumber]` confirmation page.
- `POST /api/bookings/:bookingNumber/cancel` — guest self-service cancel
  (contact-verified; pending/confirmed only).

Full detail in [section 10](#10-bookings-phase-10a).

## 4. Admin authentication (Phase 3)

**POST `/api/admin/auth/login`**  
Body: `{ email, password }` → `{ admin, access_token, token_type, expires_in }`

**GET `/api/admin/auth/me`** — Bearer required.

Env: `JWT_SECRET`, `JWT_EXPIRES_IN`.

## 5. Admin hotels (Phase 4)

| Method | Path |
|--------|------|
| `GET` | `/api/admin/hotels?q=&status=` |
| `POST` | `/api/admin/hotels` |
| `GET` | `/api/admin/hotels/:id` |
| `PATCH` | `/api/admin/hotels/:id` |
| `DELETE` | `/api/admin/hotels/:id` |

Public hotel GET contracts remain unchanged.

## 6. Admin room types (Phase 5)

| Method | Path |
|--------|------|
| `GET` | `/api/admin/room-types?q=&hotel_id=&status=&featured=` |
| `POST` | `/api/admin/room-types` |
| `GET` | `/api/admin/room-types/:id` |
| `PATCH` | `/api/admin/room-types/:id` |
| `DELETE` | `/api/admin/room-types/:id` |

`is_featured` → `metadata.is_featured` (no schema change).

## 7. Admin rooms (Phase 6)

| Method | Path |
|--------|------|
| `GET` | `/api/admin/rooms?q=&hotel_id=&room_type_id=&status=` |
| `POST` | `/api/admin/rooms` |
| `GET` | `/api/admin/rooms/:id` |
| `PATCH` | `/api/admin/rooms/:id` |
| `DELETE` | `/api/admin/rooms/:id` |

`room_type_id` must belong to the same `hotel_id`.  
Activate/deactivate in UI maps to `available` / `out_of_service`.  
Statuses: `available`, `occupied`, `maintenance`, `blocked`, `out_of_service`.
Phase 12 Front Desk room board lists `GET /api/admin/rooms?hotel_id=` and
PATCHes `{ status }` only. `rooms.status` is operational inventory and is not
auto-updated from booking status.

## 8. Admin media (Phase 7)

| Method | Path |
|--------|------|
| `GET` | `/api/admin/media?q=&hotel_id=&category=&status=` |
| `POST` | `/api/admin/media/upload` (multipart) |
| `GET` | `/api/admin/media/:id` |
| `PATCH` | `/api/admin/media/:id` |
| `DELETE` | `/api/admin/media/:id` |

Categories: Hero, Gallery, Room, Restaurant, Exterior, Lobby, Amenities  
(encoded in upload URL path). Featured: `is_cover`.

## 9. Tariffs (Phase 9)

### Public

| Method | Path |
|--------|------|
| `GET` | `/api/tariffs?hotel_slug=&room_type_id=` |

### Admin rates

| Method | Path |
|--------|------|
| `GET` | `/api/admin/tariffs?hotel_id=&room_type_id=&meal_plan=&occupancy=&status=` |
| `POST` | `/api/admin/tariffs` |
| `GET` | `/api/admin/tariffs/:id` |
| `PATCH` | `/api/admin/tariffs/:id` |
| `DELETE` | `/api/admin/tariffs/:id` |

### Admin hotel tariff settings

Stored in `hotels.metadata.tariff_settings` (no extra table).

| Method | Path |
|--------|------|
| `GET` | `/api/admin/tariffs/settings/:hotelId` |
| `PATCH` | `/api/admin/tariffs/settings/:hotelId` |

**Rate fields:** `hotel_id`, optional `room_type_id`, `meal_plan`
(`no_meal` \| `breakfast` \| `breakfast_one_meal` \| `all_meals`), `occupancy`
(`single` \| `double`), `price`, `display_note`, `valid_from`, `valid_to`,
`status` (`active` \| `inactive`).

## 10. Bookings (Phase 10A / 10B)

Direct reservations. See [ADR-0014](history/DECISIONS.md) for the availability model
and [ADR-0019](history/DECISIONS.md) for the public availability route.

Consumed by the Phase 10B guest booking UI (`/book` and `/booking/[bookingNumber]`)
through `getBookingAvailability()`, `createBooking()` and `getBookingByNumber()`
in `frontend/src/lib/api.js`.

**Notifications (Phase 10F + 11 prefs):** `POST /api/bookings` and admin
create/status endpoints trigger guest emails as fire-and-forget side effects
(confirmation, cancellation, status update). Confirmation and cancellation are
always attempted when `guest_email` is present. Status/stay-update emails skip
when `notification_preferences.email_updates` is false. Delivery failures never
change API responses. See [ADR-0022](history/DECISIONS.md) and
[ADR-0034](history/DECISIONS.md).

### Public

| Method | Path |
|--------|------|
| `GET` | `/api/bookings/availability` |
| `POST` | `/api/bookings` |
| `GET` | `/api/bookings/:bookingNumber?email=` or `?phone=` |
| `POST` | `/api/bookings/:bookingNumber/cancel` |
| `POST` | `/api/bookings/:bookingNumber/modify` |
| `POST` | `/api/bookings/:bookingNumber/modify/preview` |
| `POST` | `/api/bookings/:bookingNumber/notification-preferences` |

**`GET /api/bookings/availability`** — query `hotel_id` **or** `hotel_slug`,
`check_in_date`, `check_out_date` (`YYYY-MM-DD`). Optional `room_type_id`,
`number_of_rooms` (default 1). Past check-in rejected; checkout must be after
check-in; stay capped at 90 nights. Hotel must be `active`.

Returns `data` with hotel identity, `nights`, `currency`, and `room_types[]`.
Each room type includes `room_type_id`, `slug`, `name`, `max_occupancy`,
`bed_type`, `base_price`, inventory (`total_rooms`, `booked_rooms`,
`available_rooms`, `is_available`), and indicative amounts matching create
(`nightly_rate`, `on_request`, `subtotal`, `tax_amount`, `total_amount`).
`tax_amount` is `0` until a tax engine exists.

**`POST /api/bookings`** — required `hotel_id`, `room_type_id`, `guest_name`,
`guest_email`, `guest_phone`, `check_in_date`, `check_out_date` (`YYYY-MM-DD`).
Optional `adults` (default 1), `children` (0), `number_of_rooms` (1),
`special_requests`, `notification_preferences` (object with booleans
`email_updates`, `sms_opt_in`, `whatsapp_opt_in`; omitted → defaults).

- Always created as `booking_status=pending`, `payment_status=unpaid`,
  `booking_source=website`. Guest-supplied statuses/sources are ignored.
- Amounts are computed server-side from `room_types.base_price × nights × rooms`;
  a base price of `0` leaves the totals at `0` ("on request"). Client-supplied
  pricing is never trusted.
- The hotel and room type must both be `active`, and the room type must belong to
  the hotel. Past arrival dates are rejected; stays are capped at 90 nights.
  Adults + children cannot exceed `max_occupancy × number_of_rooms`.
- `201` returns a guest-safe payload including the generated `booking_number`
  (`M2N-YYYYMMDD-XXXXX`) and normalized `notification_preferences`. Internal ids
  and the owning admin are never included.

**`GET /api/bookings/:bookingNumber`** — guest self-service lookup. The caller
must pass the `email` **or** `phone` on the reservation; phone matching ignores
country-code prefixes. A wrong reference and a failed contact check both return
an identical `404`, so the endpoint cannot be used to enumerate bookings. Guest
contact details are omitted from the response. Payload may include
`cancellation_reason` when set and `notification_preferences`; never includes
`admin_notes`.

**`POST /api/bookings/:bookingNumber/cancel`** — guest self-service cancel
(Phase 11). Body requires `email` **or** `phone` (same verification as lookup);
optional `cancellation_reason` (max 2000). Eligible only when
`booking_status` is `pending` or `confirmed`. Sets `cancelled` + `cancelled_at`,
fires the existing cancellation email hook. Wrong contact / unknown reference →
identical `404`. Already cancelled or ineligible (e.g. `checked_in`, `no_show`)
→ `400`. Response is the guest-safe booking payload (no contact, no
`admin_notes`). Concurrent double-cancel is rejected safely.

**`POST /api/bookings/:bookingNumber/modify/preview`** — guest stay-modify
preview (Phase 11). Same contact proof as lookup. Body may include
`check_in_date`, `check_out_date`, `room_type_id`, `number_of_rooms` (at least
one required). Does not write. Returns availability for the revised stay with
this booking excluded from sold counts, plus server-calculated indicative
amounts (`base_price × nights × rooms`). Eligible: `pending` | `confirmed`.
Past check-in rejected. Never returns `admin_notes` or guest contact.

**`POST /api/bookings/:bookingNumber/modify`** — guest stay modification
(Phase 11). Same contact + stay fields as preview. Reuses
`applyBookingStayUpdate` (transactional lock + exclude-self availability +
`UPDATE`) with guest-eligible statuses only. Amounts always recalculated
server-side (client totals ignored). `hotel_id` immutable; room type must be
`active` and belong to the booking’s hotel. Fires a status-update email when
the stay changes. Wrong contact → identical `404`; ineligible status → `400`;
inventory conflict → `409`.

**`POST /api/bookings/:bookingNumber/notification-preferences`** — guest
preference update (Phase 11). Body requires `email` **or** `phone` plus
`notification_preferences` (full or partial object). Unknown keys rejected.
Confirm/cancel emails are never gated by these prefs; only optional status /
stay-update emails use `email_updates`. SMS/WhatsApp values are stored only.
Wrong contact → identical `404`. Response is the guest-safe booking payload.

### Admin (JWT)

| Method | Path |
|--------|------|
| `GET` | `/api/admin/bookings` |
| `GET` | `/api/admin/bookings/stats` |
| `POST` | `/api/admin/bookings` |
| `GET` | `/api/admin/bookings/:id` |
| `PATCH` | `/api/admin/bookings/:id` |
| `POST` | `/api/admin/bookings/:id/cancel` |
| `PATCH` | `/api/admin/bookings/:id/status` |
| `PATCH` | `/api/admin/bookings/:id/assign-room` |

**List filters:** `hotel_id`, `room_type_id`, `booking_status`, `payment_status`,
`booking_source`, `check_in_from`, `check_in_to`, `check_out_from`,
`check_out_to`, `stay_on` (bookings with `check_in_date <= stay_on` and
`check_out_date > stay_on`), `search` (booking number, guest
name, email, or phone digits), `limit` (default 50, max 100), `offset`,
`sort` (`created_at` \| `check_in_date` \| `check_out_date` \| `guest_name` \|
`booking_status` \| `total_amount` \| `booking_number`, default `created_at`),
`order` (`asc` \| `desc`, default `desc`). The response carries `count`, `total`,
`limit`, `offset`, `sort`, and `order`.

**Stats (`GET /stats`):** arrivals today, departures today, upcoming bookings,
`by_status` counts, and occupancy summary (`sellable_rooms`,
`rooms_held_tonight`, `in_house_bookings`, `occupancy_pct`) for calendar
`today` (UTC date). Optional `hotel_id` (UUID) scopes booking counts and
sellable rooms to one property; omitted or empty preserves the unscoped
platform totals. Invalid `hotel_id` → `400`. Response includes `hotel_id`
(`null` when unscoped). Must be registered before `/:id`.

**Create:** staff bookings default to `booking_source=admin` and
`booking_status=confirmed`, may use past dates (walk-ins recorded after the
fact), accept explicit amounts, and record `created_by_admin_id`. Optional
`admin_notes` (private staff text, max 2000) and `notification_preferences`
may be set on create (prefs default when omitted).

**Update (`PATCH /:id`):** guest/stay/payment/amounts/`special_requests` /
`admin_notes` / `cancellation_reason` / `notification_preferences`. Empty
`admin_notes` or `special_requests` clears to `NULL`. `admin_notes` is
admin-JWT only. Prefs accept full or partial objects (unknown keys rejected).

**Stay modification (Phase 11):** when `check_in_date`, `check_out_date`,
`room_type_id`, and/or `number_of_rooms` change, the API re-validates the
**complete revised stay** inside one transaction: `SELECT … FOR UPDATE` on the
booking, advisory locks on affected room type(s), availability with
`excludeBookingId` (so the booking’s own hold is not double-counted), then
`UPDATE`. Terminal statuses (`checked_out`, `cancelled`, `no_show`) are rejected
(`409`). `hotel_id` cannot change; room type must belong to the booking’s hotel.
Unless the PATCH body explicitly includes `subtotal` / `tax_amount` /
`total_amount`, amounts are recalculated as
`base_price × nights × number_of_rooms` (`tax_amount = 0`), matching public
indicative pricing. Changing room type or setting `number_of_rooms > 1` clears
`room_id`. Non-stay patches (e.g. notes only) skip inventory locking.

**Privacy:** `admin_notes` is never returned or accepted on public
`POST /api/bookings` / `GET /api/bookings/:bookingNumber`, availability APIs, or
guest emails. `special_requests` remains guest-visible; `cancellation_reason`
remains the cancel/no-show reason field.

**Status:** `booking_status` and/or `payment_status`. Transitions are enforced —
`pending → confirmed | cancelled | no_show`, `confirmed → checked_in | cancelled
| no_show`, `checked_in → checked_out | cancelled`; `checked_out`, `cancelled`
and `no_show` are terminal. **Confirming** stamps `confirmed_at`. **Cancelling or marking no_show** stamps
`cancelled_at` (shared terminal-exit audit column; no separate `no_show_at`) and
may store `cancellation_reason`. Payment status moves freely. Phase 12 Front
Desk check-in / check-out / no-show calls this same endpoint (no new routes).

**Cancel (`POST /:id/cancel`, Phase 11):** dedicated cancel for eligible bookings
(`pending` / `confirmed` / `checked_in`). Optional body
`cancellation_reason` (max 2000). Sets `booking_status=cancelled`, stamps
`cancelled_at`, fires the existing cancellation notification. Already-cancelled
or ineligible statuses return `400`. Legacy
`PATCH /:id/status` with `booking_status=cancelled` remains supported.

**Assign room:** attaches a physical room, or clears it with `room_id: null`.
The room must belong to the booking's hotel *and* room type, be sellable, and
not already be held by an overlapping reservation. Only single-room bookings can
be assigned (the schema carries one `room_id`).

**Update:** guest details, stay dates, room type, occupancy, counts, amounts,
currency, source, payment status, special requests. Changing dates, room type or
room count re-runs the availability check (excluding this booking) and is
refused on terminal bookings.

**Statuses:** `pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled`,
`no_show`. **Payment:** `unpaid`, `partial`, `paid`, `refunded`.
**Sources:** `website`, `admin`, `phone`, `walk_in`, `ota`.

## 10b. Inventory calendar (Phase 10D + 10I)

Physical rooms + blocking bookings (ADR-0014), with optional sparse overrides
from `room_type_inventory_dates` (ADR-0025). Public stay-range request bodies
are unchanged.

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/admin/inventory/calendar` | JWT |
| `GET` | `/api/admin/inventory/day` | JWT |
| `GET` | `/api/admin/inventory/overlaps` | JWT |
| `PUT` | `/api/admin/inventory/dates` | JWT |
| `DELETE` | `/api/admin/inventory/dates` | JWT |
| `GET` | `/api/bookings/availability/calendar` | Public |

**Calendar query:** `hotel_id` or `hotel_slug`, `from`, `to` (`YYYY-MM-DD`,
inclusive, max 92 days), optional `room_type_id`.

**Per-day fields:** `date`, `total_rooms` / `physical_total`, `allotment`,
`overbooking_allowance`, `sell_limit`, `sold_count`, `booked_rooms` (alias),
`remaining_count`, `available_rooms` (alias), `is_sold_out`, `stop_sell`,
`has_override` (true when a `room_type_inventory_dates` row exists, including
defaults-only rows), `override_id`, `source` (`null` when no row; otherwise
the persisted source), `stop_sell_supported` / `allotment_supported` /
`overbooking_allowance_supported` (`true`). Top-level calendar also sets those
supported flags to `true`.

**Night formula:** `base = COALESCE(allotment, physical)`;
`sell_limit = base + overbooking_allowance`;
`available = stop_sell ? 0 : max(0, sell_limit - sold)`. Missing override rows
keep Phase 10D physical − sold behaviour.

**Day query:** `hotel_id`, `room_type_id`, `date`.

**Overlaps query:** `hotel_id`, `room_type_id`, `check_in_date`, `check_out_date`,
optional `exclude_booking_id`. Returns stay inventory (with overrides) plus
`overlapping_bookings[]`.

### Inventory date writes (admin)

Upsert / clear sparse overrides. No schema change beyond Phase 10I table.
Smoke: `npm run verify:inventory-dates`.

**`PUT /api/admin/inventory/dates`** — upsert by
`UNIQUE (hotel_id, room_type_id, inventory_date)`.

Body (unknown keys rejected):

| Field | Required | Notes |
|-------|----------|--------|
| `hotel_id` | yes | UUID |
| `room_type_id` | yes | UUID; must belong to `hotel_id` |
| `inventory_date` | yes | `YYYY-MM-DD` |
| `allotment` | one of the four mutable fields required | `null` or integer 0–32767; omit → stored as `null` |
| `stop_sell` | | boolean; omit → `false` |
| `overbooking_allowance` | | integer ≥ 0 (max 32767); omit → `0` |
| `source` | | `manual` \| `system` \| `ota` \| `channel`; omit → `manual` |

Response `201` on insert, `200` on update. Payload includes the row, `created`,
and computed `day` inventory for that night.

**`DELETE /api/admin/inventory/dates`** — clear override (query:
`hotel_id`, `room_type_id`, `inventory_date`). Returns `200` with
`deleted: true` + post-clear `day`, or `404` if no row.

**Not in scope yet:** channel-split inventory, per-room closures, PMS/OTA
tables. `notes` / `external_ref` are not writable via this API yet. Admin
day-edit UI on `/admin/inventory` consumes these write endpoints.

## 11. Admin guests (Phase 13 CRM Lite)

Read-only hotel-scoped guest directory derived from `bookings` and `inquiries`.
No `guests` table. JWT required. `hotel_id` is required on both endpoints.

**Identity (per hotel, never cross-property)**

| Priority | Key | Rule |
|----------|-----|------|
| Primary | `email:` + `lower(trim(guest_email))` | When email is non-empty |
| Fallback | `phone:` + last 10 digits | **Only** when email is empty |
| Not a join | Name | Search only |

Different emails are never merged, even when phones match. Rows with neither
key are omitted. Repeat guest = `booking_count >= 2` at that hotel. Stay count
= bookings in `checked_in` or `checked_out`. Inquiry `confirmed` is not a
booking.

**`GET /api/admin/guests`**

Query: `hotel_id` (required UUID), `q` (optional name/email/phone), `limit`
(default 20, max 100), `offset`.

Response: `{ success, hotel_id, count, total, limit, offset, data[] }`.

Each row: `identity_key`, `identity_type`, `display_name`, `email`, `phone`,
`booking_count`, `inquiry_count`, `stay_count`, `is_repeat_guest`,
`first_seen_at`, `last_activity_at`. Search finds identities; counts still
cover all of that hotel’s source rows for the matched key.

**`GET /api/admin/guests/profile`**

Query: `hotel_id` (required UUID), `key` (`email:…` or `phone:…`).

Response: `{ success, hotel_id, data }` with `contact`, `summary`,
`bookings[]`, `inquiries[]`. `404` if no rows at that hotel for the key.
`400` for missing/invalid `hotel_id` or `key`.

Smoke: `npm run verify:crm`. Admin UI: `/admin/guests`,
`/admin/guests/profile`.

## 12. Errors & security

- Validation: `400` with `errors` array where applicable.
- Auth: `401` / `403` for admin routes.
- Not found: `404`.
- Conflict (unique / no inventory / illegal transition): `409`.
- Production: no stack traces in JSON (`NODE_ENV=production`).

See [11 — Security](11_SECURITY.md).
