# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Phase numbers below match [`13_ROADMAP.md`](13_ROADMAP.md) (consolidated 2026-07-14).

---

## [Unreleased]

### Added — Phase 10G — Admin Create Booking Form ✅

- **What changed.** Admin create-booking UI at `/admin/bookings/new` over existing
  `POST /api/admin/bookings` and public availability probe. Guest/stay/source/
  status fields, availability check before submit, indicative price summary,
  notes via `special_requests`, and a post-create confirmation screen. No schema
  change; booking logic unchanged.
- **Files created:** `frontend/src/app/admin/(protected)/bookings/new/page.js`,
  `frontend/src/components/admin/BookingCreateForm.js`.
- **Files modified:** `adminBookings.js` (create helpers), bookings list CTA,
  dashboard copy, docs.
- **APIs added:** none (reuses admin create + public availability).
- **Database changes:** none.
- **Frontend changes:** admin create booking form + confirmation.
- **Backend changes:** none.
- **Remaining work:** stop-sell schema (approval); internal notes column;
  inquiries UI.

### Added — Phase 10F — Booking Confirmation Email & Notification System ✅

- **What changed.** Provider-agnostic email layer (`services/email`) with console
  (dev log) and SMTP (nodemailer) transports, M2N-branded HTML templates for
  booking confirmation, cancellation, and status updates, and fire-and-forget
  hooks on public/admin booking create + admin status changes. No schema change;
  booking APIs unchanged aside from non-blocking notification side effects.
- **Files created:** `backend/services/email/**`,
  `backend/services/bookingNotification.service.js`,
  `backend/scripts/verifyPhase10F.js`.
- **Files modified:** `booking.controller.js`, `adminBooking.controller.js`,
  `backend/.env.example`, `backend/package.json` (+ nodemailer), docs.
- **APIs added:** none (side-effect notifications only).
- **Database changes:** none.
- **Frontend changes:** none.
- **Backend changes:** email abstraction + booking notification hooks.
- **Remaining work:** stop-sell schema (approval); internal notes column;
  admin create-booking form; inquiries UI; real SMTP credentials in deploy env.

### Added — Phase 10E — Admin Inventory Calendar UI ✅

- **What changed.** Admin PMS inventory calendar at `/admin/inventory` consuming
  `GET /api/admin/inventory/calendar`. Monthly grid with prev/next, hotel + room
  type selectors, day-wise total/booked/remaining/occupancy %, and color coding
  (green available / yellow low / red sold out). Loading, empty, and error states.
  No schema change; booking logic untouched.
- **Files created:** `frontend/src/lib/adminInventory.js`,
  `frontend/src/components/admin/InventoryCalendarGrid.js`,
  `frontend/src/app/admin/(protected)/inventory/page.js`.
- **Files modified:** `AdminGuard.js` (nav), `dashboard/page.js` (card), docs.
- **APIs added:** none (uses Phase 10D calendar endpoint).
- **Database changes:** none.
- **Frontend changes:** inventory calendar UI + admin nav/dashboard link.
- **Backend changes:** none.
- **Remaining work:** stop-sell/allotment schema (approval); confirmation email;
  internal notes column; admin create-booking form; inquiries UI.

### Added — Phase 10D — Availability & Inventory Engine ✅

- **What changed.** Derived inventory engine for per-day sold/remaining counts,
  stay-peak parity with the booking engine, overlap diagnostics, and
  calendar-ready admin + public APIs. No schema change. Existing
  `POST /api/bookings` and `GET /api/bookings/availability` unchanged.
- **Services created:** `backend/services/inventory.service.js`
- **Files modified:** `controllers/inventory.controller.js`,
  `routes/adminInventory.routes.js`, `routes/booking.routes.js`,
  `routes/index.js`, `scripts/verifyPhase10D.js`, `package.json`.
- **APIs added:**
  - `GET /api/admin/inventory/calendar?hotel_id|hotel_slug&from&to&room_type_id?`
  - `GET /api/admin/inventory/day?hotel_id&room_type_id&date`
  - `GET /api/admin/inventory/overlaps?hotel_id&room_type_id&check_in_date&check_out_date`
  - `GET /api/bookings/availability/calendar?hotel_slug|hotel_id&from&to&room_type_id?`
- **Per-day fields:** `total_rooms`, `sold_count`, `remaining_count`,
  `available_rooms`/`booked_rooms` aliases, `is_sold_out`.
- **Stop-sell / allotment / overbooking allowance:** not in schema —
  responses expose `stop_sell_supported: false` (and related flags); documented
  as pending pending migration approval.
- **Database changes:** none.
- **Frontend changes:** none (APIs prepared for future calendar UI).
- **Verification:** `npm run verify:phase10d` (23/23); `test:bookings` 76/76;
  frontend `npm run build` passed.
- **Remaining:** admin calendar UI; persistent stop-sell/allotment (schema);
  confirmation email; admin create-booking form; internal notes column.

### Fixed — Phase 10C verification: no_show now stamps cancelled_at ✅

- **What changed.** During Phase 10C verification, `PATCH /api/admin/bookings/:id/status`
  with `booking_status=no_show` persisted `cancellation_reason` but did not stamp
  `cancelled_at`, so the admin timeline/audit trail missed no-show exits.
- **Files modified:** `backend/controllers/adminBooking.controller.js`,
  `backend/scripts/verifyPhase10C.js` (new), `backend/package.json`
  (`verify:phase10c`).
- **APIs changed:** status update stamps `cancelled_at` for both `cancelled` and
  `no_show` (no schema change; reuses existing column).
- **Database changes:** none.
- **Frontend changes:** none.
- **Backend changes:** audit stamp only.
- **Verification:** backend `:5001` healthy; frontend `:3000` serving; admin login
  rejects bad credentials; admin bookings APIs gated at 401 without JWT;
  list/search/hotel/status/date/sort/pagination/detail/stats/status transitions
  verified; `npm run build` passed; `test:bookings` 76/76; `verify:phase10c` 35/35.
- **Remaining work:** availability calendar / allotment / stop-sells; confirmation
  email; dedicated internal-notes column (schema approval); admin create-booking form.

### Added — Phase 10C — Admin Booking Management ✅

- **What changed.** Admin bookings console at `/admin/bookings` (list + detail)
  over Phase 10A APIs, plus dashboard booking statistics. Public homepage, hotel
  pages, media, inquiry form, and guest `/book` UI are unchanged.
- **Files modified (backend):** `controllers/adminBooking.controller.js` (list
  `sort`/`order`, `GET /stats`), `routes/adminBooking.routes.js`,
  `scripts/testBookings.js`.
- **Files modified (frontend):** `lib/adminBookings.js`, `AdminGuard` nav,
  `StatusBadge` booking/payment styles, `ConfirmDialog` children support,
  `admin/(protected)/bookings/page.js`, `bookings/[id]/page.js`,
  `dashboard/page.js`.
- **APIs added/changed:** `GET /api/admin/bookings/stats`; list accepts
  `sort` + `order` and echoes them. Existing status/assign/update endpoints
  reused unchanged.
- **Database changes:** none. Guest/staff notes use `special_requests`; cancel /
  no-show reasons use `cancellation_reason`. Timeline derived from
  `created_at` / `confirmed_at` / `cancelled_at` / `updated_at`.
- **Frontend changes:** search, hotel/status/date filters, pagination, sorting,
  status badges, confirm/cancel/check-in/check-out/no-show actions (transition-
  guarded), room assign, notes save, dashboard arrivals/departures/upcoming/
  occupancy + by-status counts.
- **Backend changes:** sort whitelist + stats aggregates only.
- **Remaining work:** availability calendar / allotment / stop-sells; dedicated
  internal-notes column (schema approval); confirmation email; admin create-
  booking form; inquiries UI.

### Changed — Phase 10B five-step booking UI + public availability API ✅

- **What changed.** Guest booking at `/book` is now a five-step flow:
  Stay Details → Available Rooms → Guest Details → Review → Confirmation.
  Step 2 calls the new public availability endpoint (live inventory + indicative
  pricing). Hotel “Book Your Stay” / sticky “Book Now” deep-link to
  `/book?hotel=<slug>`; room cards keep `/book?hotel=&room=`. Inquiry form
  unchanged. Homepage hero and hotel media untouched.
- **Files modified (backend):** `controllers/booking.controller.js`,
  `routes/booking.routes.js`, `validators/booking.validator.js`,
  `scripts/testBookings.js`.
- **Files modified (frontend):** `components/booking/*` (modular steps),
  `lib/api.js` (`getBookingAvailability`), `Hero.js`, `StickyBookCTA.js`,
  `app/hotels/[slug]/page.js`, `app/book/page.js`,
  `app/booking/[bookingNumber]/page.js` (uses `BookingLookup`).
- **APIs added:** `GET /api/bookings/availability` — query `hotel_id` or
  `hotel_slug`, `check_in_date`, `check_out_date`, optional `room_type_id`,
  `number_of_rooms`. Returns per room type: inventory counts, `is_available`,
  `nightly_rate` / `on_request`, `subtotal`, `tax_amount` (always 0 today),
  `total_amount`, `bed_type`, `max_occupancy`.
- **APIs unchanged:** `POST /api/bookings`, `GET /api/bookings/:bookingNumber`.
- **Database changes:** none.
- **Frontend changes:** five-step modular UI; availability loading/empty/error;
  review + inline confirmation with Home / View Hotel; Indian-mobile-friendly
  phone validation; `NEXT_PUBLIC_API_BASE_URL` with `NEXT_PUBLIC_API_URL` fallback.
- **Backend changes:** thin public wrapper over existing
  `booking.service.checkAvailability` (no schema change).
- **Remaining work:** Phase 10C admin bookings UI; set room-type `base_price`
  for live totals (BASE-PRICE); payment gateway later.

### Fixed — Restored original homepage brand-hero.jpg from Git ✅

- **Previous wrong image path (what the browser showed):** logo-only BrandHero
  using `/m2n-logo-tagline.png` on a CSS atmosphere (commit `6676472`), after the
  stock file had been deleted.
- **Restored original image path:** `/brand-hero.jpg`
  (`frontend/public/brand-hero.jpg`).
- **Git source:** restored byte-identical from commit
  `336582d` (“Updated project”, 2026-08-02) — SHA-256
  `b63e51293e547e9b66b13e233eb9338081699876b6fec19559e2cd1776b42bef`.
  Confirmed hospitality sunset / pool background photo, not a logo and not
  Zaarang/Aurelia `/Photos` files.
- **What changed.** Re-checked out `brand-hero.jpg` from history. Restored
  photographic `BrandHero` layout (overlays, tagline, CTAs unchanged).
  `resolveBrandHeroImage()` still ignores hotel lists and returns only
  `/brand-hero.jpg`. Hotel detail pages untouched.
- **APIs / database / backend:** none.
- **Remaining work:** none for this restore.

### Fixed — Homepage brand hero was a stock resort photo file ✅

Superseded for the homepage visual: deleting the file and switching to a logo
hero was incorrect for product intent. The original `/brand-hero.jpg` from
`336582d` is the required brand background (see restore entry above). Separation
from hotel API/`/Photos` media remains in force ([ADR-0018](history/DECISIONS.md)).

### Fixed — Homepage brand hero no longer uses hotel photography ✅

Superseded by the asset-level restore above. The earlier code-path fix
(stop selecting featured-hotel media) remains correct.

### Added — Phase 10B — Guest Booking UI ✅

Public frontend only. No schema change, no admin module touched, no new backend
endpoint, and no payment gateway. Phase 10A's APIs are consumed as they are.

- `/book` rebuilt as a three-step reservation flow — **Select Hotel → Room &
  Dates → Guest Details** — replacing the hotel-picker placeholder. Deep links
  are supported (`/book?hotel=<slug>&room=<room-type-slug>`) and open the flow at
  step 2 with that property and room preselected.
- Live stay summary (`BookingPriceSummary`) recalculates hotel, room, dates,
  nights, guests, rooms and the indicative total on every edit. It uses the same
  formula as the server (`base_price × nights × rooms`, no tax component), so the
  figure shown is the figure the API records. Where a room type has no published
  base price, it reads "Price on request" and quotes the lowest published Phase 9
  tariff rate as guidance.
- Availability is validated in two layers: a client guard blocks room counts
  above the property's sellable inventory (`GET /api/rooms`, statuses
  `available` / `occupied`), and a `409` from `POST /api/bookings` returns the
  guest to step 2 with the server's message intact so they can adjust the stay.
- `/booking/[bookingNumber]` confirmation page. After a booking is created the
  guest's contact detail is held in `sessionStorage` so the page loads directly;
  on a fresh tab it asks for the email or mobile on the reservation, which
  doubles as a "find my booking" screen. The route is `noindex` and disallowed in
  `robots.txt`.
- Loading, validation and error states throughout: route-level skeletons, an
  inline field-level validator mirroring the backend limits (90-night maximum,
  ≤30 adults, ≤30 children, ≤20 rooms, 2000-character requests), distinct
  handling for validation (400), availability (409), rate limiting (429) and
  network failures, plus an advisory notice when guests exceed the room's stated
  occupancy.
- Room-card "Book Now" on hotel pages now opens the booking flow with that hotel
  and room preselected instead of scrolling to the inquiry form. The inquiry form
  itself is unchanged and still available.
- Frontend helpers: `lib/bookingPricing.js` (backend-mirrored limits, night
  maths, totals, sellable inventory), `lib/bookingSession.js` (tab-scoped lookup
  contact), and `createBooking` / `getBookingByNumber` / `getBookingPageData` in
  `lib/api.js`.
- Booking-flow imagery is resolved on the server and passed down as URLs, because
  `lib/images.js` reads the photo folders through `node:fs` and cannot run in a
  client component ([ADR-0015](history/DECISIONS.md)). Each property still draws
  only from its own `Photos/` folder.

**Database changes:** none. No migration, no column, no seed data change.

**Backend changes:** none. `POST /api/bookings`, `GET /api/bookings/:bookingNumber`,
`GET /api/hotels`, `GET /api/rooms`, `GET /api/rooms/types` and `GET /api/tariffs`
are all consumed exactly as Phases 8–10A shipped them.

**APIs added/changed:** none. New *frontend clients* only — `createBooking()`,
`getBookingByNumber()` and `getBookingPageData()` in `frontend/src/lib/api.js`.

**Frontend files added**

| File | Role |
|------|------|
| `src/app/book/page.js` | Booking flow shell (rewritten from the hotel-picker placeholder); reads `?hotel=` / `?room=`, resolves images server-side |
| `src/app/booking/[bookingNumber]/page.js` | Confirmation route, `noindex` |
| `src/app/booking/[bookingNumber]/loading.js` | Route skeleton |
| `src/components/booking/BookingFlow.js` | Step state machine, validation, submit and error routing |
| `src/components/booking/BookingHotelStep.js` | Step 1 — hotel selection tiles |
| `src/components/booking/BookingStayStep.js` | Step 2 — room, dates, occupancy, inventory guard |
| `src/components/booking/BookingGuestStep.js` | Step 3 — guest details |
| `src/components/booking/BookingPriceSummary.js` | Live stay summary |
| `src/components/booking/BookingConfirmation.js` | Confirmation + contact-verified lookup |
| `src/components/booking/formStyles.js` | Shared field/button classes (matches the inquiry form) |
| `src/lib/bookingPricing.js` | Limits, night maths, totals and sellable inventory, mirrored from the backend |
| `src/lib/bookingSession.js` | Tab-scoped lookup contact |

**Frontend files modified**

| File | Change |
|------|--------|
| `src/lib/api.js` | Added `getBookingPageData`, `createBooking`, `getBookingByNumber` |
| `src/components/FeaturedRooms.js` | Room-card "Book Now" now deep-links into `/book` instead of the inquiry anchor |
| `src/app/robots.js` | Disallow `/booking/` |

**Remaining work**

- Set a nightly `base_price` per room type (Admin → Room Types) so quotes show a
  live total instead of "Price on request". Data task, no code change.
- Admin bookings console and per-date inventory rules, previously grouped under
  Phase 10B, move to **Phase 10C**.
- Confirmation email / notification (Phase 11) and payments (Phase 14).
- Guest self-service modification and cancellation (Phase 11).

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
- Homepage brand hero resolves from featured hotel API media when available
  (**superseded 2026-08-04** — homepage uses `/brand-hero.jpg` only; see
  [ADR-0016](history/DECISIONS.md)).

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
