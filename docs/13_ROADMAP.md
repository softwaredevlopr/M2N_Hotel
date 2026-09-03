# 13 — Roadmap

> **Status:** Living document · **Last updated:** 2026-08-19  
> **Related:** [01 — Project Status](01_PROJECT_STATUS.md) · [00 — Overview](00_PROJECT_OVERVIEW.md)

---

## Table of Contents

- [1. Vision](#1-vision)
- [2. Completed phases (1–7)](#2-completed-phases-17)
- [3. Phases 8–15](#3-upcoming-phases-815)
- [4. Phase numbering note](#4-phase-numbering-note)
- [5. Backlog](#5-backlog)

---

## 1. Vision

**Single hotel site → multi-property platform → multi-tenant SaaS.**

Design principle: data-driven and **slug-scoped**. No hotel shares another hotel’s
content or photos.

---

## 2. Completed phases (1–7)

| Phase | Name | Status | Summary |
|-------|------|--------|---------|
| **1** | Public Website | ✅ | Multi-hotel Next.js site, hotel detail pages, Photos folders, SEO hardening |
| **2** | Booking Inquiry | ✅ | `InquiryForm` → `POST /api/inquiries`, validation, rate limits |
| **3** | Admin Authentication | ✅ | `admin_users`, JWT login `/api/admin/auth`, `/admin/login`, guarded console |
| **4** | Hotel Management | ✅ | `/admin/hotels` + `/api/admin/hotels` CRUD |
| **5** | Room Type Management | ✅ | `/admin/room-types` + `/api/admin/room-types` CRUD |
| **6** | Rooms Management | ✅ | `/admin/rooms` + `/api/admin/rooms` CRUD |
| **7** | Hotel Media Management | ✅ | `/admin/media` + `/api/admin/media` upload/CRUD |

Supporting delivery already in place: PostgreSQL schema + seed, public REST reads
(`hotels`, `rooms`, `rooms/types`), `/health`, Helmet/CORS/rate limits.

---

## 3. Upcoming phases (8–15)

### Phase 8 — Public Website Dynamic Integration ✅

Replace static / filesystem-driven hotel presentation with API-backed data:

- ✅ Replace static hotel data with APIs
- ✅ Dynamic room cards (API room types + metadata; tariff fallback for meal matrix)
- ✅ Dynamic gallery (API media + category inference)
- ✅ Dynamic amenities (API `hotel.amenities`)
- ✅ Dynamic hotel details, contact, policies, inquiry form context
- ✅ Dynamic featured media (hero/cards on hotel pages; homepage brand hero is
  `/brand-hero.jpg` from Git history, never hotel `/Photos`)

### Phase 9 — Tariff & Rate Management ✅

Admin-managed rates in PostgreSQL (`tariff_rates`):

- ✅ CRUD admin APIs + public read API
- ✅ Admin tariffs module (hotel / room type / meal plan / occupancy filters)
- ✅ Seasonal `valid_from` / `valid_to`, active/inactive status
- ✅ Public meal-plan matrix from API; note cells → “Available with room plan”
- ⬜ Room-card package copy still partially in `lib/tariffs.js` (future migration)

### Phase 10A — Booking Engine Backend Foundation ✅

Reservation storage and REST APIs for direct bookings:

- ✅ `bookings` table (migration `004`), `hotel_id`-scoped for multi-property
- ✅ Availability derived from `rooms` + live reservations — peak per-night
  occupancy, transaction + advisory lock ([ADR-0014](history/DECISIONS.md))
- ✅ Public create + contact-verified guest lookup
- ✅ Admin list/filter/paginate, detail, create, update, status transitions,
  room assignment
- ✅ `npm run test:bookings` smoke suite
- ⬜ No UI in this phase

### Phase 10B — Guest Booking UI ✅

The public reservation journey over the Phase 10A APIs (+ availability route):

- ✅ `/book` five-step flow (Stay Details → Available Rooms → Guest Details →
  Review → Confirmation)
- ✅ `GET /api/bookings/availability` for date-aware inventory + indicative rates
- ✅ Deep links from hotel / room CTAs (`/book?hotel=<slug>&room=<slug>`)
- ✅ Live stay summary using server pricing / availability amounts
- ✅ Submit via `POST /api/bookings`; `409` returns to Available Rooms
- ✅ `/booking/[bookingNumber]` contact-verified guest lookup
- ✅ Loading, validation, error and responsive states
- ⬜ No payment gateway, no confirmation email (Phases 11 / 14)

### Phase 10C — Admin Bookings & Inventory Rules ✅ / ⬜

Admin bookings console over `/api/admin/bookings` (module shipped 2026-08-04):

- ✅ `/admin/bookings` list (search, filters, pagination, sorting)
- ✅ Booking detail + status actions + room assignment
- ✅ Dashboard booking statistics (`GET /api/admin/bookings/stats`)
- ✅ List `sort` / `order` query params
- ✅ Verified 2026-08-05 (`npm run verify:phase10c`); no_show stamps `cancelled_at`
- ⬜ Availability calendars, per-date allotment, stop-sells, out-of-service
  coordination
- ⬜ Confirmation email / notification
- ✅ Dedicated internal-notes column (`bookings.admin_notes`, migration `006`)
+ ✅ Dedicated internal-notes column (`bookings.admin_notes`, migration `006`)
- ⬜ Admin create-booking form

(Split out of the original Phase 10B on 2026-08-03.)

### Phase 10D — Availability & Inventory Engine ✅

Derived inventory (no new tables) for calendar-ready APIs:

- ✅ `services/inventory.service.js` — per-day sold/remaining, stay peak, overlaps
- ✅ `GET /api/admin/inventory/calendar|day|overlaps`
- ✅ `GET /api/bookings/availability/calendar` (public; does not replace stay-range
  `/availability`)
- ✅ Parity checks vs `booking.service.checkAvailability`
- ✅ Admin calendar UI at `/admin/inventory` (Phase 10E)
- ✅ Persistent stop-sell / allotment / overbooking_allowance (Phase 10I)

### Phase 10I — Persistent room-type inventory dates ✅

- ✅ Migration `005_room_type_inventory_dates.sql` (approved sparse table)
- ✅ Shared capacity helper + booking/inventory service integration
- ✅ Stop-sell, allotment, overbooking allowance in availability formula
- ✅ Calendar/day flags `*_supported: true`; public request bodies unchanged
- ✅ Smoke: `npm run verify:phase10i` (plus updated `verify:phase10d`)
- ✅ Admin write APIs — `PUT` / `DELETE /api/admin/inventory/dates`
  (`npm run verify:inventory-dates`)
- ✅ Admin UI / day-edit on `/admin/inventory`
- ⬜ Channel-split inventory, per-room closures, PMS/OTA tables (later)

### Phase 10E — Admin Inventory Calendar UI ✅

- ✅ `/admin/inventory` monthly view (prev/next, hotel + room type filters)
- ✅ Day-wise total / booked / remaining / occupancy % with color coding
- ✅ Loading, empty, error states; admin nav integration
- ✅ Click day → edit panel (stop-sell / allotment / overbooking / source) + clear
  override via ConfirmDialog (uses inventory-date write APIs)

### Phase 10F — Booking Confirmation Email & Notification System ✅

- ✅ Email provider abstraction (`console` + `smtp`; `EMAIL_PROVIDER=auto`)
- ✅ Branded HTML templates: confirmation, cancellation, status update
- ✅ Hooks on public/admin create and admin booking status changes
- ✅ Dev mode logs emails when SMTP is not configured
- ✅ `npm run verify:phase10f` (no SMTP credentials required)
- ⬜ Wire a production SMTP/API provider with real credentials at deploy time

### Phase 10G — Admin Create Booking Form ✅

- ✅ `/admin/bookings/new` guest/stay form over `POST /api/admin/bookings`
- ✅ Availability check via `GET /api/bookings/availability` before submit
- ✅ Indicative price summary; notes via `special_requests`
- ✅ Post-create confirmation screen; list CTA
- ⬜ Optional room auto-assign on create (still admin detail action)

### Phase 10H — Admin Inquiries CRUD UI ✅

- ✅ `/admin/inquiries` list (search, status/hotel filters, pagination)
- ✅ Detail view with status update + `admin_notes`
- ✅ Delete with confirmation; toasts; loading/empty/error states
- ✅ JWT on list/get/status/delete; public `POST /api/inquiries` unchanged

### Phase 11 — Booking Engine Completion ✅ / ◐

End-to-end guest journey polish, guest self-service modification/cancellation,
and richer notification preferences.

- ✅ Admin dedicated cancel API + confirm UI (`POST /api/admin/bookings/:id/cancel`,
  existing schema only; optional `cancellation_reason`)
- ✅ Guest self-service cancellation (contact-verified
  `POST /api/bookings/:bookingNumber/cancel`; pending/confirmed only)
- ✅ Admin stay modification (transactional `PATCH /:id` + detail UI; dates /
  room type / rooms; exclude-self availability; auto-reprice; no schema change)
- ✅ Guest self-service stay modification / reschedule (contact-verified
  `POST …/modify` + preview; pending/confirmed only; reuses
  `applyBookingStayUpdate`; no schema change)
- ✅ Notification preference controls (migration `007` JSONB;
  create/lookup/admin + guest update; status emails gated; confirm/cancel
  ungated; SMS/WhatsApp store-only)
- ✅ Broader guest journey polish (durable confirmation handoff, find-booking
  entry, CTA/wording consistency, occupancy guard)

### Phase 12 — PMS Lite ✅

Lightweight property-management views over the existing booking engine
(Full PMS-compatible: hotel isolation, no second reservation system).

- ✅ Hotel-scoped admin booking stats (`GET /api/admin/bookings/stats?hotel_id=`)
- ✅ Front Desk board (`/admin/front-desk`) — arrivals, departures, in-house
- ✅ Front Desk check-in / check-out / no-show actions (reuse status APIs)
- ✅ Room status board (`/admin/front-desk?view=rooms`) — physical rooms +
  operational `rooms.status` + assigned booking occupancy (no auto-sync)
- Housekeeping workflow and folio/payments are out of scope for PMS Lite

### Phase 13 — CRM 🔶 Lite (search + 360 + open leads)

Guest relationship layer over existing bookings and inquiries (no guest table).

- ✅ Hotel-scoped derived guest search (`GET /api/admin/guests`)
- ✅ Guest 360 (`GET /api/admin/guests/profile`) — contact, booking/stay
  history, inquiry history, repeat-guest flag
- ✅ Admin UI `/admin/guests` + `/admin/guests/profile` (JWT; hotel required)
- ✅ Open-leads visibility via existing inquiry statuses (`pending` /
  `contacted` / `quoted`) + read-only source-record `admin_notes`
- Out of scope here: merge UI, loyalty, campaigns, SMS/WhatsApp, marketing
  automation, guest master table, dated follow-up table

### Phase 14 — Payments & Invoice 🔶 Lite (backend)

Manual payments and GST-ready invoice snapshots without a gateway or ERP
([ADR-0041](history/DECISIONS.md)).

- ✅ Migration `008` — `booking_payments`, `booking_invoices`,
  `hotel_invoice_sequences`
- ✅ Admin JWT ledger APIs (record payment/refund, void)
- ✅ Admin JWT invoice draft / issue / void / reissue
- ✅ Transactional `bookings.payment_status` sync
- ✅ Admin booking-detail Payments & Invoices UI (`/admin/bookings/[id]`)
- Out of scope for Lite: live payment gateway, folio engine, credit notes,
  GSTR/accounting export

### Phase 15 — Multi-Property SaaS 🔶 Lite (foundation complete)

Tenant isolation, self-serve onboarding, and read-only operator billing for
multi-property operators ([ADR-0042](history/DECISIONS.md)).

- ✅ Migration `009` — `tenants`, `tenant_memberships`, `hotels.tenant_id`
  (backfill default tenant)
- ✅ Tenant isolation AuthZ — `resolveAdminTenancy`, `assertHotelAccess`;
  cross-tenant access → 404; `super_admin` bypass
- ✅ Public `POST /api/admin/onboarding` — transactional tenant + owner admin +
  membership + first hotel; JWT on success; 10 req / 15 min
- ✅ Admin UI `/admin/onboarding` + login ↔ onboarding links; auto session +
  redirect to `/admin/dashboard`
- ✅ `GET /api/admin/tenant` — read-only billing summary (safe tenant fields
  only); smoke `verify:phase15-billing`
- ✅ Admin UI `/admin/billing` — read-only plan/subscription view; Billing nav
  item; no payment actions
- ✅ Seed scripts post-`009` compatible (`be2351a`) — attach hotels to existing
  `m2n-hotels`; `seed:admin` ensures `owner` membership ([ADR-0043](history/DECISIONS.md))
- ⬜ Live SaaS payment gateway / subscription management (Stripe, Razorpay,
  checkout, plan mutation, cancellation — future; out of Lite)
- Out of scope for Lite: per-hotel ACL within tenant, ERP

---

## 4. Phase numbering note

In July 2026 the product roadmap was **consolidated** into the table above.
Earlier docs/commits sometimes labeled admin work as “Phase 1–5/7” (admin-only
sequence). Prefer this document’s numbering going forward. Historical ADRs in
[`history/DECISIONS.md`](history/DECISIONS.md) remain valid; they may reference
older labels.

---

## 5. Backlog

- Admin Inquiries CRUD UI (API list/get/patch already exist).
- Deployment runbooks ([12 — Deployment](12_DEPLOYMENT.md)) — readiness guide
  complete; staging/production cutover still operator-run.
- Production contact details (replace placeholders).
- Automated tests.
