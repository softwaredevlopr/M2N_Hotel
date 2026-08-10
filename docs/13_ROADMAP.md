# 13 — Roadmap

> **Status:** Living document · **Last updated:** 2026-08-03  
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
- ⬜ Dedicated internal-notes column (schema approval)
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
- ⬜ Admin UI / day-edit on `/admin/inventory`
- ⬜ Channel-split inventory, per-room closures, PMS/OTA tables (later)

### Phase 10E — Admin Inventory Calendar UI ✅

- ✅ `/admin/inventory` monthly view (prev/next, hotel + room type filters)
- ✅ Day-wise total / booked / remaining / occupancy % with color coding
- ✅ Loading, empty, error states; admin nav integration
- ⬜ Click-through to bookings / day detail drill-down (future polish)

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

### Phase 11 — Booking Engine Completion ⬜

End-to-end guest journey polish, guest self-service modification/cancellation,
and richer notification preferences.

### Phase 12 — PMS Lite ⬜

Lightweight property-management views (arrivals, room status, basic ops).

### Phase 13 — CRM ⬜

Guest profiles, inquiry/booking history, follow-ups.

### Phase 14 — Payments & Invoice ⬜

Payment capture, receipts/invoices, reconciliation hooks.

### Phase 15 — Multi-Property SaaS ⬜

Self-serve hotel onboarding, tenant isolation, billing for operators.

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
- Deployment runbooks ([12 — Deployment](12_DEPLOYMENT.md)).
- Production contact details (replace placeholders).
- Automated tests.
