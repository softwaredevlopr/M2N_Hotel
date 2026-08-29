# 01 — Project Status

> **Status:** Living document · **Last updated:** 2026-08-29  
> **Related:** [`../PROJECT_DOCS.md`](../PROJECT_DOCS.md) · [13 — Roadmap](13_ROADMAP.md)

---

## Table of Contents

- [1. Snapshot](#1-snapshot)
- [2. Completed](#2-completed)
- [3. In Progress](#3-in-progress)
- [4. Pending / Next Up](#4-pending--next-up)
- [5. Known Issues](#5-known-issues)
- [6. Status Log](#6-status-log)

---

## 1. Snapshot

| Area | Status |
|------|--------|
| Public website (multi-hotel) | ✅ Complete |
| Hotel detail pages | ✅ Complete |
| Booking inquiry form | ✅ Complete (`POST /api/inquiries`) |
| Backend REST APIs | ✅ Complete (public + admin) |
| PostgreSQL integration | ✅ Connected (`/health`) |
| Admin authentication / JWT | ✅ Complete |
| Hotel management (admin) | ✅ Complete |
| Room type management (admin) | ✅ Complete |
| Rooms management (admin) | ✅ Complete |
| Hotel media management (admin) | ✅ Complete |
| Public site fully API-driven | ✅ Phase 8 |
| Tariff / rates in DB + admin | ✅ Phase 9 |
| Booking engine — backend + APIs | ✅ Phase 10A |
| Booking engine — guest UI (`/book`, confirmation) | ✅ Phase 10B |
| Booking engine — admin console | ✅ Phase 10C (module + stats) |
| Booking engine — inventory calendar APIs | ✅ Phase 10D |
| Booking engine — admin inventory calendar UI | ✅ Phase 10E |
| Booking engine — confirmation emails | ✅ Phase 10F |
| Booking engine — admin create booking form | ✅ Phase 10G |
| Admin inquiries CRUD UI | ✅ Phase 10H |
| Booking engine — persistent inventory dates | ✅ Phase 10I |
| Admin inventory-date write APIs | ✅ Complete |
| Admin inventory-date edit UI | ✅ Complete |
| Booking admin_notes (private) | ✅ Complete (migration `006`) |
| Deployment docs / readiness | ✅ Documented ([12 — Deployment](12_DEPLOYMENT.md)) |
| Staging / production cutover | ⬜ Pending (operator) |
| Phase 11 — admin cancel | ✅ Complete (existing schema) |
| Phase 11 — guest self-service cancel | ✅ Complete (existing schema) |
| Phase 11 — admin stay modification | ✅ Complete (existing schema) |
| Phase 11 — guest stay modification | ✅ Complete (existing schema) |
| Phase 11 — notification preferences | ✅ Complete (migration `007`) |
| Phase 11 — guest journey polish | ✅ Complete (no schema) |
| Phase 12 — Front Desk board | ✅ Complete (no schema) |
| Phase 12 — Front Desk status actions | ✅ Complete (no schema) |
| Phase 12 — Room status board | ✅ Complete (no schema) |
| Phase 13 — CRM Lite guest search + 360 | ✅ First slice (no schema) |
| Phase 13 — CRM Lite open leads on 360 | ✅ (no schema) |
| Phase 14 — Payments & Invoice Lite schema (`008`) | ✅ |
| Phase 14 — admin payment/invoice APIs | ✅ (no gateway) |
| Phase 14 — booking-detail Payments & Invoices UI | ✅ |
| Phase 15 Lite — tenant isolation (migration `009` + AuthZ) | ✅ |
| Phase 15 — self-serve onboarding API | ✅ |
| Phase 15 — admin onboarding UI (`/admin/onboarding`) | ✅ |
| Phase 15 — operator billing stub UI | ⬜ Pending |
| Phase 15 — payment gateway / SaaS billing | ⬜ Out of scope (Lite) |

**Roadmap progress:** Phases **1–9** ✅, **10A–10I** ✅ · Phase **11** ✅ ·
Phase **12** PMS Lite ✅ · Phase **13** CRM Lite (search + 360 + open leads) ✅ ·
Phase **14** Lite (ledger + invoices + booking-detail UI) ✅ · Phase **15** Lite
(tenant isolation + self-serve onboarding) ✅ · Next: operator billing stub UI;
Full CRM only if approved; staging cutover

---

## 2. Completed

### Phase 1 — Public Website ✅

- Multi-hotel Next.js frontend from one codebase.
- Aurelia Grand + Zaarang Inn live (`/hotels/[slug]`).
- Hotel-wise `Photos/` folders; gallery/room cards skip empty categories.
- Premium hotel detail UX (rooms, tariff UI, facilities, gallery lightbox, map,
  sticky CTA, reveal animations).
- SEO: metadata, OG, robots, sitemap, manifest, JSON-LD.
- Security/a11y/performance baseline on public surfaces.

### Phase 2 — Booking Inquiry ✅

- Reusable `InquiryForm` → `POST /api/inquiries`.
- Client + server validation; rate limiting on write.
- Hotel context via `hotel.slug`.

### Phase 3 — Admin Authentication ✅

- `admin_users` (migration `002`), bcrypt passwords, JWT login + `/me`.
- `/admin/login`, protected console (`AdminGuard`), localStorage token.
- Admin shell uses full desktop viewport width (220px sidebar + expanding
  main); not capped at `max-w-6xl` ([ADR-0038](history/DECISIONS.md)).
- `requireAdminAuth` on all `/api/admin/*` write modules.

### Phase 4 — Hotel Management ✅

- `/admin/hotels` (+ new / edit / detail) and `/api/admin/hotels` CRUD.
- Public `GET /api/hotels` unchanged.

### Phase 5 — Room Type Management ✅

- `/admin/room-types` and `/api/admin/room-types` CRUD.
- Featured via `metadata.is_featured` (no schema change).

### Phase 6 — Rooms Management ✅

- `/admin/rooms` and `/api/admin/rooms` CRUD.
- Activate → `available` / deactivate → `out_of_service`.

### Phase 7 — Hotel Media Management ✅

- `/admin/media` upload/list/edit and `/api/admin/media`.
- Categories via upload URL path; featured via `is_cover`.

### Phase 8 — Public Website Dynamic Integration ✅

- Hotel detail pages consume public APIs (details, media, amenities, room types).
- Loading/error boundaries on public routes.

### Phase 9 — Tariff & Rate Management ✅

- Migration `003_tariff_rates.sql`.
- Public `GET /api/tariffs`; admin CRUD `/api/admin/tariffs`.
- Admin `/admin/tariffs` module (filters, seasonal dates, settings).
- Public tariff matrix from API; note-only cells for unpublished rates.

### Phase 10A — Booking Engine Backend Foundation ✅

- Migration `004_bookings.sql` — reservations table, `hotel_id`-scoped.
- Public `POST /api/bookings`; contact-verified `GET /api/bookings/:bookingNumber`.
- Admin JWT `/api/admin/bookings` — list (filters + pagination), detail, create,
  update, status transitions, room assignment.
- Overbooking protection: per-night peak occupancy in a transaction with an
  advisory lock per hotel + room type ([ADR-0014](history/DECISIONS.md)).
- `npm run test:bookings` — 71 checks, self-cleaning. Backend only for 10A core;
  availability route covered for 10B.

### Phase 10B — Guest Booking UI ✅

- `/book` five-step flow: Stay Details → Available Rooms → Guest Details →
  Review → Confirmation, with deep links (`/book?hotel=<slug>&room=<slug>`).
- Live stay summary; Step 2 loads `GET /api/bookings/availability` (inventory +
  indicative amounts). Submit via `POST /api/bookings`; `409` returns to rooms.
- Hotel hero / sticky CTAs open `/book?hotel=`; inquiry form unchanged.
- `/booking/[bookingNumber]` contact-verified lookup (`BookingLookup`), `noindex`.
- No payment gateway. Availability route added without a schema change.

### Phase 10C — Admin Booking Management ✅ (module)

- `/admin/bookings` list: search, hotel/status/check-in date filters, pagination,
  sorting (`sort`/`order`).
- Booking detail: guest, stay, room, pricing, derived timeline, notes.
- Actions: confirm, cancel, check-in, check-out, no-show (API transition rules),
  room assign/unassign for single-room stays.
- Dashboard booking stats via `GET /api/admin/bookings/stats` (arrivals,
  departures, upcoming, occupancy, by-status).
- Status badges for booking + payment statuses. No schema change; public site
  untouched.
- Verified 2026-08-05: auth gate, list filters/sort/pagination, detail, status
  transitions + `cancellation_reason`, stats, frontend build; no_show now stamps
  `cancelled_at` for timeline audit (reuses existing column).
- Still pending under later phases: deployment / non-local migrate.

### Phase 10D — Availability & Inventory Engine ✅

- `services/inventory.service.js` — per-day sold/remaining, stay-peak parity with
  `booking.service.checkAvailability`, overlap detection, hotel + room-type
  calendars (max 92 days).
- Admin APIs under `/api/admin/inventory/*` (calendar, day, overlaps).
- Public `GET /api/bookings/availability/calendar` for future widgets; existing
  stay-range `GET /api/bookings/availability` unchanged.
- Stop-sell / allotment / overbooking allowance **not in schema** — responses
  set `*_supported: false`; migration requires explicit approval.
- Verified via `npm run verify:phase10d`. Admin UI delivered in Phase 10E.

### Phase 10E — Admin Inventory Calendar UI ✅

- `/admin/inventory` monthly PMS calendar over `GET /api/admin/inventory/calendar`.
- Hotel + room-type selectors, prev/next month, day cells with total / booked /
  remaining / occupancy %, color coding (available / low / sold out).
- Loading, empty, and error states; admin nav + dashboard card. No schema or
  booking-logic changes.

### Phase 10F — Booking Confirmation Email & Notification System ✅

- Provider-agnostic `services/email` (console log when SMTP unset; nodemailer SMTP
  when configured). Env: `EMAIL_*`, `SMTP_*` (placeholders in `.env.example`).
- Branded HTML templates: confirmation, cancellation, status update.
- Fire-and-forget hooks on public/admin booking create and admin status changes.
  Email failures never fail booking APIs. Verify: `npm run verify:phase10f`.

### Phase 10G — Admin Create Booking Form ✅

- `/admin/bookings/new` — guest details, hotel/room type, dates, adults/children,
  source/status/payment, notes via `special_requests`, availability check before
  submit (`GET /api/bookings/availability`), indicative price summary, confirmation
  screen. Reuses `POST /api/admin/bookings`. No schema change.

### Phase 10H — Admin Inquiries CRUD UI ✅

- `/admin/inquiries` list: search (name/email/phone), hotel + status filters,
  pagination, loading/empty/error states, delete with confirmation.
- `/admin/inquiries/[id]` detail: guest/stay/message, status change, admin notes
  (`admin_notes`), delete. Public inquiry form (`POST /api/inquiries`) unchanged.
- List/get/status/delete require admin JWT; no schema change.

### Phase 10I — Persistent inventory dates ✅

- Migration `005_room_type_inventory_dates.sql` — sparse per hotel / room type /
  night overrides (`stop_sell`, `allotment`, `overbooking_allowance`).
- Booking + inventory services apply the approved availability formula; missing
  rows keep Phase 10D behaviour. Public request bodies unchanged.
- Calendar/day APIs set `*_supported: true`. Smoke: `npm run verify:phase10i`.
- Admin edit UI for inventory date rows still pending.

### Phase 12 — PMS Lite Front Desk ✅

- Optional `hotel_id` on `GET /api/admin/bookings/stats` (unscoped totals
  unchanged; invalid UUID → 400). Occupancy sellable rooms scoped via
  `rooms.hotel_id`.
- `/admin/front-desk` requires a hotel, then shows hotel-scoped stats plus
  today's arrivals, departures, and in-house lists (existing booking APIs;
  rows link to `/admin/bookings/[id]`).
- Check-in / check-out / no-show via existing `PATCH /:id/status` and the
  same transition table; optional single-room assign on check-in.
- Room status panel (`?view=rooms`) lists physical rooms for the selected hotel
  and PATCHes operational `rooms.status` via existing `PATCH /api/admin/rooms/:id`.
  Assigned booking occupancy is joined in the UI and is not auto-synced to
  `rooms.status`.
- Backward-compatible list filters: `check_out_from`, `check_out_to`, `stay_on`.
- No schema, housekeeping, or folio. Smoke: `npm run verify:front-desk`.

### Phase 13 — CRM Lite guest search + Guest 360 ✅ (first slice)

- Read-only hotel-scoped guests derived from `bookings` and `inquiries`.
  No `guests` table and no migration.
- Identity: email (lower/trim) when present; last-10 phone only if email is
  empty. Different emails are never merged. Repeat = ≥2 bookings at that hotel.
- `GET /api/admin/guests` and `GET /api/admin/guests/profile` (JWT,
  required `hotel_id`). UI: `/admin/guests` and `/admin/guests/profile`.
- Smoke: `npm run verify:crm`. Dated follow-ups, marketing, loyalty, and
  messaging providers are not in this slice.

### Phase 13 — CRM Lite open leads on Guest 360 ✅

- Open lead = inquiry at that hotel in `pending`, `contacted`, or `quoted`.
  `confirmed` / `declined` / `cancelled` are excluded.
- Guest 360 shows `open_leads[]` and read-only `staff_notes[]` from source
  `admin_notes`. Edit notes on existing booking/inquiry detail pages.
- Guests list includes `open_lead_count`. No follow-up table, no schema.
- Smoke: `npm run verify:crm`.

### Phase 14 — Payments & Invoice Lite schema ✅

- Migration `008_booking_payments_and_invoices.sql` adds hotel-scoped
  `hotel_invoice_sequences`, `booking_invoices`, and `booking_payments`.
- Existing `bookings.payment_status` (`unpaid` \| `partial` \| `paid` \|
  `refunded`) is unchanged and remains the summary field.
- [ADR-0041](history/DECISIONS.md). No gateway, no folio, no ERP.

### Phase 14 — admin payment and invoice APIs ✅

- JWT nested routes under `/api/admin/bookings/:id/payments` and `/invoices`.
- Required `hotel_id` query; booking hotel must match.
- Manual ledger: append-only `payment` / `refund` rows (amount always `> 0`);
  mistaken rows are voided, not deleted. Refunds cannot exceed net collected.
- Invoices: draft → issue → void; at most one issued invoice per booking;
  reissue via a new draft with `replaces_invoice_id`.
- Every ledger write and invoice issue/void recomputes `bookings.payment_status`
  in the same transaction. Billed total = issued invoice `total_amount` when
  present, else `bookings.total_amount`.
- No admin UI, no public payment APIs, no live gateway.
- Smoke: `npm run verify:phase14`.

### Phase 14 — admin booking-detail Payments & Invoices UI ✅

- `/admin/bookings/[id]` adds Payments and Invoices panels over the JWT finance
  APIs. Summary shows payment status, billed total, collected, refunded, net,
  and outstanding. Staff can record payment/refund, void mistaken ledger rows,
  and draft/issue/void/reissue invoices. No gateway, no card PAN collection.
- Files: `adminBookingFinance.js`, `BookingPaymentsPanel.js`,
  `BookingInvoicesPanel.js`, booking detail page, `StatusBadge` styles.
- Smoke: frontend `npm run build`; backend `npm run verify:phase14`.

### Phase 15 Lite — tenant isolation ✅

- Migration `009_tenancy_lite.sql`: `tenants`, `tenant_memberships`,
  `hotels.tenant_id` with non-destructive backfill for existing hotels
  ([ADR-0042](history/DECISIONS.md)).
- `resolveAdminTenancy` + `assertHotelAccess` on hotel-scoped admin APIs;
  cross-tenant `hotel_id` → **404**; inactive memberships excluded;
  `super_admin` platform bypass.
- Lite semantics: membership grants all hotels under that tenant (no per-hotel
  ACL). Smoke: `npm run verify:phase15`.

### Phase 15 — self-serve onboarding ✅

- Public `POST /api/admin/onboarding` (no JWT; 10 requests / 15 min).
- Single transaction creates: `tenants` row (`trial` / `lite` / `trialing`),
  `admin_users` (`hotel_admin`), `tenant_memberships` (`owner`), first
  `hotels` row (`draft`). Unique conflicts → 409 generic message.
- Returns 201 with `tenant`, `admin`, `hotel`, `access_token`, `token_type`,
  `expires_in`. Smoke: `npm run verify:phase15-onboarding`.
- No new schema in this slice (uses migration `009` tables).

### Phase 15 — admin onboarding UI ✅

- Public `/admin/onboarding` (outside protected shell); matches `/admin/login`
  visual design.
- Form fields align with backend validator; optional location/phone; password
  min 8; slug auto-fill from names (`slugifyHotelName`), editable.
- Success: `setAdminSession(access_token, admin)` → `/admin/dashboard`.
  Authenticated visitors redirect to dashboard (same as login).
- `/admin/login` ↔ `/admin/onboarding` navigation links.
- Client: `adminOnboard()` in `frontend/src/lib/api.js`.

### Platform foundations ✅

- PostgreSQL schema (`001_initial_schema.sql`) + seed scripts.
- Public reads: hotels, room types, rooms; inquiries write + admin inquiry reads.
- Backend `/health` (server + DB).

---

## 3. In Progress

- Staging cutover remains operator-run per
  [12 — Deployment](12_DEPLOYMENT.md).

---

## 4. Pending / Next Up

1. Provision staging/production hosts + secrets; non-local migrate
   `005`/`006`/`007`/`008`.
2. Replace placeholder contact details before public launch.
3. Phase **15** operator billing stub UI (read-only plan/subscription from
   `tenants` columns; no payment gateway).
4. Remaining Phase **13** only if separately approved (Full CRM guest master /
   merge, or a dated follow-up table).

---

## 5. Known Issues

| ID | Issue | Severity | Notes |
|----|-------|----------|-------|
| MED-SEED | Aurelia Grand seed `hotel_media` URLs are flat paths whose files moved to `Photos/` | Low | Renders correctly via filesystem fallback; reconcile seed when convenient. Zaarang Inn reconciled 2026-08-02 |
| ROOM-HOTEL | `bookings.room_id` consistency with `hotel_id` is enforced in the application, not by a constraint | Low | A composite FK would need `UNIQUE (id, hotel_id)` on `rooms` — an existing-table change requiring approval |
| CONTACT | Placeholder contact strings in seed/UI | Medium | Replace before launch |
| BASE-PRICE | Overnight Deluxe ₹1999 / Suite ₹2999 set on both hotels; Standard stays `0.00` (₹999 couple package is not nightly) | Done | Admin Room Types edit + `npm run set:base-prices` / `verify:base-prices`. Package display unchanged |

---

## 6. Status Log

| Date | Update |
|------|--------|
| 2026-08-29 | Phase 15 admin onboarding UI (`/admin/onboarding`) + docs sync |
| 2026-08-26 | Phase 15 self-serve onboarding API (`POST /api/admin/onboarding`) |
| 2026-08-22 | Phase 15 Lite tenant isolation (migration `009` + AuthZ) |
| 2026-08-20 | Phase 14 Lite booking-detail Payments & Invoices UI |
| 2026-08-19 | Phase 14 Lite admin payment/invoice APIs (no UI/gateway) |
| 2026-08-18 | Phase 14 Lite schema foundation (migration `008`, ADR-0041) |
| 2026-08-17 | Phase 13 CRM Lite open leads + source-record notes on Guest 360 |
| 2026-08-16 | Phase 13 CRM Lite derived guest search + Guest 360 (no schema) |
| 2026-08-16 | Admin console shell uses full desktop viewport width (`AdminGuard`) |
| 2026-08-14 | Phase 12 PMS Lite verified (no schema; Front Desk complete) |
| 2026-08-14 | Phase 12 Front Desk room status board |
| 2026-08-14 | Phase 12 Front Desk check-in / check-out / no-show |
| 2026-08-14 | Phase 12 PMS Lite Front Desk first slice |
| 2026-08-13 | Phase 11 broader guest journey polish |
| 2026-08-13 | Phase 11 booking notification preferences (migration `007`) |
| 2026-08-13 | Phase 11 guest self-service stay modification |
| 2026-08-12 | Phase 11 admin stay modification (transactional + UI) |
| 2026-08-12 | Phase 11 guest self-service booking cancel (contact-verified) |
| 2026-08-12 | Phase 11 admin booking cancel API + confirm UI (no schema change) |
| 2026-08-10 | Admin inventory-date write APIs (`PUT`/`DELETE /api/admin/inventory/dates`) |
| 2026-08-08 | Phase 10I persistent `room_type_inventory_dates` (stop-sell/allotment/overbooking) |
| 2026-08-06 | Operational: set Deluxe/Suite overnight `base_price` (1999/2999); Standard remains 0 for couple package |
| 2026-08-06 | Phase 10H admin inquiries CRUD UI at `/admin/inquiries` |
| 2026-08-05 | Phase 10G admin create booking form at `/admin/bookings/new` |
| 2026-08-05 | Phase 10F booking confirmation email & notification system (console + SMTP providers) |
| 2026-08-05 | Phase 10E admin inventory calendar UI at `/admin/inventory` |
| 2026-08-05 | Phase 10D availability & inventory engine (derived calendar APIs; stop-sell pending schema) |
| 2026-08-05 | Phase 10C verified end-to-end; fixed no_show audit stamp (`cancelled_at`); added `npm run verify:phase10c` |
| 2026-08-04 | Phase 10C admin bookings module + dashboard stats (`/admin/bookings`, `GET /api/admin/bookings/stats`, list sort) |
| 2026-08-04 | Phase 10B upgraded to five-step `/book` UI + public `GET /api/bookings/availability`; hotel Book Now CTAs wired; inquiry form preserved |
| 2026-08-04 | Restored original homepage `/brand-hero.jpg` from Git `336582d`; logo-only hero reverted; hotel pages unchanged |
| 2026-08-04 | Fixed homepage hero completely — removed stock `brand-hero.jpg` resort file; BrandHero is logo + brand atmosphere only; hotel pages unchanged |
| 2026-08-04 | Fixed homepage hero regression — brand hero is `/brand-hero.jpg` only; hotel photos stay on `/hotels/[slug]` |
| 2026-08-03 | Phase 10B complete — guest booking flow at `/book`, live stay summary, availability validation, `/booking/[bookingNumber]` confirmation and lookup |
| 2026-08-02 | Phase 10A complete — bookings schema, availability engine, public + admin booking APIs |
| 2026-08-02 | Fixed Zaarang Inn media regression — stock placeholder `hotel_media` rows replaced with its real `Photos/Zaarang-Inn/**` photography; stock-host and cross-hotel fallback guards added |
| 2026-08-02 | Phase 9 complete — tariff_rates schema, admin/public tariff APIs, admin UI |
| 2026-08-02 | Phase 8 complete — API-driven public hotel pages, loading/error states |
| 2026-07-14 | Docs refreshed; roadmap renumbered to Phases 1–15; Phases 1–7 marked complete |
| 2026-07 | Admin modules: hotels, room types, rooms, media; JWT admin console |
| 2026-07 | Public site + inquiry + hardening shipped |
