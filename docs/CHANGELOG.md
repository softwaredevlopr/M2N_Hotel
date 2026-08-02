# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Phase numbers below match [`13_ROADMAP.md`](13_ROADMAP.md) (consolidated 2026-07-14).

---

## [Unreleased]

### Added — Phase 10A — Booking Engine Backend Foundation ✅

Backend only. No frontend booking pages, no payment gateway, OTA or channel
manager, and no change to tariff content, media, or the public hotel page design.

- Migration `004_bookings.sql` — `bookings` table with `booking_number`
  (unique reference), hotel/room-type/optional-room foreign keys, guest details,
  stay dates, occupancy, source, booking + payment status, amounts, currency,
  audit stamps, and `CHECK` constraints matching project convention (no native
  enums). `hotel_id` is retained throughout for multi-property support.
- Availability engine (`services/booking.service.js`) — every reservation is
  written inside one transaction that takes a transaction-scoped advisory lock on
  `(hotel_id, room_type_id)`, locks the room rows `FOR SHARE`, then compares the
  request against **peak per-night occupancy** rather than a naive sum of
  overlapping bookings. Nights are half-open, so a checkout date is immediately
  resellable.
- Public `POST /api/bookings` — validated guest booking; always `pending` /
  `unpaid` / `website`, with amounts computed server-side from
  `room_types.base_price` (client pricing is never trusted).
- Public `GET /api/bookings/:bookingNumber` — guest lookup gated on the email or
  phone held on the reservation; unknown references and failed verification are
  indistinguishable, and contact details are never echoed back.
- Admin JWT `GET/POST /api/admin/bookings`, `GET /:id`, `PATCH /:id`,
  `PATCH /:id/status`, `PATCH /:id/assign-room` — filters for hotel, room type,
  booking/payment status, source, check-in window and free-text search, with
  `limit`/`offset` pagination and a `total`.
- Enforced booking status transitions with `confirmed_at` / `cancelled_at`
  stamping; room assignment validated against hotel, room type, room state and
  overlapping reservations.
- Rate limiting extended to the new public routes (`POST` 20/15min,
  `GET` 60/15min), both overridable via env for integration runs.
- `npm run test:bookings` — 64-check smoke test covering the happy path,
  validation, cross-hotel rejection, sold-out inventory, concurrent booking
  races, guest lookup verification, and the full admin surface. It removes every
  booking it creates.
- Booking date columns are serialised as `YYYY-MM-DD` strings so a `DATE` never
  shifts a day through JSON for clients away from UTC.

### Fixed — Hotel Zaarang Inn media (post–Phase 8 regression) ✅

- **Root cause.** `hotel_media` for `hotel-zaarang-inn` held four seeded
  `images.unsplash.com` stock placeholders (resort exterior, wooden guest room,
  lobby, dining) dating from when Zaarang had no photo shoot. Phase 8 made image
  resolution **API-first**, and `isResolvableMediaUrl()` accepted *any* absolute
  `http(s)` URL, so those rows outranked Zaarang's real
  `public/Photos/Zaarang-Inn/**` photography for hero, story, room cards, and
  gallery. Aurelia Grand was unaffected because its seeded rows are flat local
  paths whose files no longer exist, so they fail the local-file check and it
  silently falls back to `Photos/Aurelia-Grand/**`.
- **Data corrected.** `ZAARANG_MEDIA` now builds from Zaarang's own
  `/Photos/Zaarang-Inn/<Category>/<n>.jpg` files (17 rows: Hero 1, Exterior 6,
  Reception 2, Lobby 3, Rooms 3, Bathroom 2) with a single cover. Re-running
  `npm run seed` inserted the 17 real rows and set the 4 stock rows to
  `inactive` (non-destructive; no image file deleted or overwritten).
- **Guards added.** `lib/media.js` rejects known stock/demo image hosts, derives
  categories from `/Photos/<Hotel>/<Category>/` as well as `/uploads/`, honours
  `status` only when present (the public API omits it), and normalises to exactly
  one cover. `lib/images.js` keeps every hotel-level fallback inside that hotel's
  own folder, so one property can never borrow another's photography.
- **Verified.** `/hotels/hotel-zaarang-inn` renders 17 images, all
  `/Photos/Zaarang-Inn/**` (hero `Hero/1.jpg`, story `Lobby/1.jpg`, rooms
  `Rooms/1–3.jpg`); zero Unsplash and zero Aurelia references.
  `/hotels/m2n-hotel-aurelia-grand` unchanged: same 20 media rows, same cover,
  same 22 rendered `Photos/Aurelia-Grand/**` images. No schema, layout, or
  tariff changes.

### Added — Phase 9 — Tariff & Rate Management ✅

- Migration `003_tariff_rates.sql` — `tariff_rates` table (hotel, optional room type,
  meal plan, occupancy, price/note, seasonal dates, active/inactive).
- Public `GET /api/tariffs?hotel_slug=` — meal-plan matrix for hotel detail pages.
- Admin JWT CRUD `/api/admin/tariffs` + hotel settings `/api/admin/tariffs/settings/:hotelId`.
- Admin UI: `/admin/tariffs` (list, filters, settings), `/new`, `/[id]/edit`.
- Public `RoomTariff` reads API matrix; unavailable cells show **“Available with room plan”**.
- Seed: official meal-plan matrix rows for Aurelia Grand and Zaarang Inn.
- Room-card package data still from `lib/tariffs.js` until migrated to DB/metadata.

### Added — Phase 8 — Public Website Dynamic Integration ✅

- Public hotel pages now load **hotel details, media, amenities, room types, contact,
  policies, and inquiry context** from existing backend APIs (`GET /api/hotels/:slug`,
  `GET /api/rooms/types`, `GET /api/hotels`).
- New helpers: `frontend/src/lib/media.js`, `frontend/src/lib/policies.js`; API-first
  resolution in `images.js` and `facilities.js` with filesystem fallback when seeded
  media URLs are stale.
- Room cards prefer API `base_price` / `metadata`; tariff matrix still uses
  `lib/tariffs.js` until Phase 9 (no backend contract changes).
- Loading states: `app/loading.js`, `hotels/[slug]/loading.js`, `book/loading.js`,
  `PublicPageLoading`.
- Error states: `app/error.js`, `hotels/[slug]/error.js` with retry + home navigation.
- Homepage brand hero resolves from featured hotel API media when available.

### Documentation

- Full documentation refresh: README, status, roadmap (Phases 1–15), architecture,
  database, API, folder structure, agents context, and aliases.
- Clarified completed Phases **1–7** and upcoming **8–15**.

---

## Completed phases — summary changelog

### Phase 1 — Public Website ✅

- Multi-hotel Next.js site from a single codebase.
- Hotel detail pages at `/hotels/[slug]` for Aurelia Grand and Zaarang Inn.
- Hotel-wise `public/Photos/<Hotel>/<Category>/` imagery with empty-category skip.
- Premium detail UX: room showcase, tariff section, facilities, gallery lightbox,
  location/map, sticky Book Now CTA, scroll reveals.
- SEO: metadata, Open Graph, robots.txt, sitemap, web manifest, JSON-LD.
- Accessibility and performance baselines (lazy images, focus rings, live regions).
- Backend public reads for hotels (and related entities) + `/health`.

### Phase 2 — Booking Inquiry ✅

- Reusable `InquiryForm` on hotel pages.
- `POST /api/inquiries` with validation, rate limiting, and PostgreSQL `inquiries`.
- Client-side field validation and success/error UX.
- Shared `createInquiry()` API helper.

### Phase 3 — Admin Authentication ✅

- Migration `002_admin_users.sql`; bcrypt password hashes.
- `POST /api/admin/auth/login`, `GET /api/admin/auth/me`, `requireAdminAuth`.
- Frontend `/admin/login` + JWT in localStorage; protected `/admin/*` shell.
- `npm run seed:admin`; env `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_*`.

### Phase 4 — Hotel Management ✅

- Admin UI: `/admin/hotels`, `/new`, `/[id]`, `/[id]/edit`.
- JWT CRUD: `/api/admin/hotels` (search, status filter, validation, toasts).
- Public `GET /api/hotels` contracts unchanged.

### Phase 5 — Room Type Management ✅

- Admin UI: `/admin/room-types`, `/new`, `/[id]/edit`.
- JWT CRUD: `/api/admin/room-types`.
- Featured flag via `metadata.is_featured` (no schema change).

### Phase 6 — Rooms Management ✅

- Admin UI: `/admin/rooms`, `/new`, `/[id]/edit`.
- JWT CRUD: `/api/admin/rooms` (hotel/type/status filters).
- Activate → `available`; deactivate → `out_of_service`.

### Phase 7 — Hotel Media Management ✅

- Admin UI: `/admin/media`, `/upload`, `/[id]/edit`.
- JWT APIs: `/api/admin/media` + multipart upload (Multer).
- Categories via URL path; featured via `is_cover`; files under `/uploads`.

### Phase 9 — Tariff & Rate Management ✅

- `tariff_rates` table + public/admin tariff APIs.
- Admin `/admin/tariffs` module; public meal-plan matrix from API.

### Platform / hardening (cross-cutting)

- PostgreSQL schema `001_initial_schema.sql` and seed scripts.
- Helmet, CORS allow-list, body-size limits, rate limiting, production error hygiene.
- Structured docs under `docs/` + `AGENTS.md` operating manual.

---

## Historical detail (pre-consolidation notes)

Earlier commits labeled some admin work as “Phase 1–5/7” in an admin-only sequence.
Those deliveries are preserved above under the **product** phase numbers 3–7.
Tariff/meal-plan content iterations (shared `lib/tariffs.js`, Couple package on
room cards, etc.) remain part of Phase 1 public UX polish and are unchanged by
the roadmap renumbering.

For decision records see [`history/DECISIONS.md`](history/DECISIONS.md).  
For release-oriented highlights see [`history/RELEASE_NOTES.md`](history/RELEASE_NOTES.md).
