# 04 — API Reference

> **Status:** Living document · **Last updated:** 2026-08-02  
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
- [11. Errors & security](#11-errors--security)

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
| `GET` | `/api/inquiries` | Public* | 2 |
| `GET` | `/api/inquiries/:id` | Public* | 2 |
| `PATCH` | `/api/inquiries/:id` | Public* | 2 |
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
| `GET` | `/api/bookings/:bookingNumber` | Public + contact check | 10A |
| `GET` | `/api/admin/bookings` | JWT | 10A/10C |
| `GET` | `/api/admin/bookings/stats` | JWT | 10C |
| `POST` | `/api/admin/bookings` | JWT | 10A |
| `GET` | `/api/admin/bookings/:id` | JWT | 10A |
| `PATCH` | `/api/admin/bookings/:id` | JWT | 10A |
| `PATCH` | `/api/admin/bookings/:id/status` | JWT | 10A |
| `PATCH` | `/api/admin/bookings/:id/assign-room` | JWT | 10A |

\*Inquiry list/get/patch exist on the API; admin UI for inquiries is still pending.

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

### Inquiries (Phase 2)

- `POST /api/inquiries` — create booking inquiry (validated)
- List / get / patch endpoints available for future admin UI

### Tariffs (Phase 9)

- `GET /api/tariffs?hotel_slug=` — active meal-plan matrix for an active hotel.
  Optional `room_type_id` for scoped resolution. Returns `mealPlans[]` (single/double
  rates or `singleNote`/`doubleNote`), plus hotel-level settings from
  `hotels.metadata.tariff_settings` (disclaimer, extra bed, GST, cancellation).

### Bookings (Phase 10A / 10B)

- `GET /api/bookings/availability` — live inventory + indicative amounts for a
  stay window (Phase 10B UI Step 2). Must be registered before `/:bookingNumber`.
- `POST /api/bookings` — create a reservation request (availability checked).
- `GET /api/bookings/:bookingNumber?email=` — guest lookup, contact-verified.
  Backs the `/booking/[bookingNumber]` confirmation page.

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

### Public

| Method | Path |
|--------|------|
| `GET` | `/api/bookings/availability` |
| `POST` | `/api/bookings` |
| `GET` | `/api/bookings/:bookingNumber?email=` or `?phone=` |

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
`special_requests`.

- Always created as `booking_status=pending`, `payment_status=unpaid`,
  `booking_source=website`. Guest-supplied statuses/sources are ignored.
- Amounts are computed server-side from `room_types.base_price × nights × rooms`;
  a base price of `0` leaves the totals at `0` ("on request"). Client-supplied
  pricing is never trusted.
- The hotel and room type must both be `active`, and the room type must belong to
  the hotel. Past arrival dates are rejected; stays are capped at 90 nights.
- `201` returns a guest-safe payload including the generated `booking_number`
  (`M2N-YYYYMMDD-XXXXX`). Internal ids and the owning admin are never included.

**`GET /api/bookings/:bookingNumber`** — guest self-service lookup. The caller
must pass the `email` **or** `phone` on the reservation; phone matching ignores
country-code prefixes. A wrong reference and a failed contact check both return
an identical `404`, so the endpoint cannot be used to enumerate bookings. Guest
contact details are omitted from the response.

### Admin (JWT)

| Method | Path |
|--------|------|
| `GET` | `/api/admin/bookings` |
| `GET` | `/api/admin/bookings/stats` |
| `POST` | `/api/admin/bookings` |
| `GET` | `/api/admin/bookings/:id` |
| `PATCH` | `/api/admin/bookings/:id` |
| `PATCH` | `/api/admin/bookings/:id/status` |
| `PATCH` | `/api/admin/bookings/:id/assign-room` |

**List filters:** `hotel_id`, `room_type_id`, `booking_status`, `payment_status`,
`booking_source`, `check_in_from`, `check_in_to`, `search` (booking number, guest
name, email, or phone digits), `limit` (default 50, max 100), `offset`,
`sort` (`created_at` \| `check_in_date` \| `check_out_date` \| `guest_name` \|
`booking_status` \| `total_amount` \| `booking_number`, default `created_at`),
`order` (`asc` \| `desc`, default `desc`). The response carries `count`, `total`,
`limit`, `offset`, `sort`, and `order`.

**Stats (`GET /stats`):** arrivals today, departures today, upcoming bookings,
`by_status` counts, and occupancy summary (`sellable_rooms`,
`rooms_held_tonight`, `in_house_bookings`, `occupancy_pct`) for calendar
`today` (UTC date). Must be registered before `/:id`.

**Create:** staff bookings default to `booking_source=admin` and
`booking_status=confirmed`, may use past dates (walk-ins recorded after the
fact), accept explicit amounts, and record `created_by_admin_id`.

**Status:** `booking_status` and/or `payment_status`. Transitions are enforced —
`pending → confirmed | cancelled | no_show`, `confirmed → checked_in | cancelled
| no_show`, `checked_in → checked_out | cancelled`; `checked_out`, `cancelled`
and `no_show` are terminal. **Confirming** stamps `confirmed_at`. **Cancelling or marking no_show** stamps
`cancelled_at` (shared terminal-exit audit column; no separate `no_show_at`) and
may store `cancellation_reason`. Payment status moves freely.

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

## 11. Errors & security

- Validation: `400` with `errors` array where applicable.
- Auth: `401` / `403` for admin routes.
- Not found: `404`.
- Conflict (unique / no inventory / illegal transition): `409`.
- Production: no stack traces in JSON (`NODE_ENV=production`).

See [11 — Security](11_SECURITY.md).
