# TODO — M2N Hotels Active Task Tracker

> **Purpose:** Day-to-day tracker ([`AGENTS.md`](AGENTS.md) §10.1).  
> **Status:** [`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md) ·  
> **Roadmap:** [`docs/13_ROADMAP.md`](docs/13_ROADMAP.md)

---

## Current focus

- [x] **Phase 10A–10I** — booking engine, inventory, emails, inquiries,
      admin_notes (see completed sections below / status docs).
- [x] **Phase 11 — Booking Engine Completion**
  - [x] Admin cancellation workflow (`POST /api/admin/bookings/:id/cancel` +
        confirm UI; existing schema only).
  - [x] Guest self-service cancellation (contact-verified
        `POST /api/bookings/:bookingNumber/cancel`).
  - [x] Admin stay modification (transactional inventory revalidate + UPDATE,
        auto-reprice, detail UI; `npm run verify:admin-stay-modify`).
  - [x] Guest self-service stay modification / reschedule
        (`POST …/modify` + preview; `npm run verify:guest-stay-modify`).
  - [x] Notification preference controls (migration `007`;
        `npm run verify:notification-prefs`).
  - [x] Guest journey polish (durable confirmation, find-booking, CTA/wording,
        occupancy guard).
- [x] **Phase 12 — PMS Lite**
  - [x] Hotel-scoped `GET /api/admin/bookings/stats?hotel_id=` + `/admin/front-desk`
        (arrivals / departures / in-house). Smoke: `npm run verify:front-desk`.
  - [x] Front Desk check-in / check-out / no-show actions (reuse status APIs).
  - [x] Room status board on `/admin/front-desk` (existing rooms list/PATCH;
        occupancy joined from bookings; no auto-sync).
- [x] **Phase 13 — CRM Lite (first slice)** — derived guest search + Guest 360
      over bookings/inquiries (`/admin/guests`). No schema. Smoke:
      `npm run verify:crm`.
- [x] **Phase 13 — CRM Lite open leads** — Guest 360 open leads from inquiry
      statuses `pending` / `contacted` / `quoted`; read-only source-record
      `admin_notes`. No schema. Smoke: `npm run verify:crm`.
- [x] **Phase 10B** — Guest booking UI (`/book` five-step flow, availability API,
      live stay summary, review + confirmation, `/booking/[bookingNumber]`
      lookup). Hotel/room CTAs deep-link to `/book`; inquiry form preserved.
      No payment gateway.
- [x] **Phase 10C (module verified 2026-08-05)** — Admin bookings module
      (`/admin/bookings` list, filters, pagination, sorting, detail, status
      actions, room assignment) + dashboard booking stats. No schema change.
      Smoke: `npm run verify:phase10c` / `npm run test:bookings`.
  - [x] Dedicated internal-notes column — `bookings.admin_notes` (migration
        `006`); admin UI + privacy guards. Smoke: `verify:phase10c`.
- [x] **Phase 10D — Availability & Inventory Engine** — derived per-day
      inventory service + calendar/day/overlaps APIs (admin + public calendar).
      Smoke: `npm run verify:phase10d`.
- [x] **Phase 10I — Persistent inventory dates** — migration `005`
      (`room_type_inventory_dates`), stop-sell / allotment / overbooking in
      booking + inventory services. Public request bodies unchanged. Smoke:
      `npm run verify:phase10i`.
  - [x] Admin write APIs — `PUT`/`DELETE /api/admin/inventory/dates`
        (upsert + clear). Smoke: `npm run verify:inventory-dates`.
  - [x] Admin UI day-edit on `/admin/inventory` over those write APIs.
  - [x] Day GET returns `has_override` / `source`; Clear only when a row exists.
- [x] **Phase 10E — Admin Inventory Calendar UI** — `/admin/inventory` monthly
      calendar (hotel/room-type filters, color-coded availability). Consumes
      Phase 10D/10I calendar API.
- [x] **Phase 10F — Booking Confirmation Email & Notification System** —
      email provider abstraction (console + SMTP), branded HTML templates
      (confirmation / cancellation / status update), hooked into booking create
      and admin status changes. No schema change. Smoke: `npm run verify:phase10f`.
- [x] **Phase 10G — Admin Create Booking Form** — `/admin/bookings/new` with
      guest/stay fields, availability check, price summary, notes
      (`special_requests`), confirmation screen. Reuses existing admin create API.
      No schema change.
- [x] **Phase 10H — Admin Inquiries CRUD UI** — `/admin/inquiries` list + detail
      (search, status filter, pagination, status update, delete). Reuses inquiry
      APIs; JWT on list/get/status/delete; public POST unchanged. No schema change.

---

## High priority

- [x] Set overnight `base_price` for Deluxe (₹1999) and Suite (₹2999) on Zaarang
      and Aurelia. Standard stays `0.00` (₹999 is the 3-hour couple package, not
      nightly). Scripts: `npm run set:base-prices` / `verify:base-prices`.
- [x] Deployment docs — [`docs/12_DEPLOYMENT.md`](docs/12_DEPLOYMENT.md)
      (architecture, env matrix, 005/006 rollout checklist, security / rollback).
      Docs only — no staging/production deploy or non-local migrate yet.
- [ ] Replace placeholder contact details before launch.
- [ ] Run `npm run migrate` on every environment for `004_bookings.sql`,
      `005_room_type_inventory_dates.sql`, `006_booking_admin_notes.sql`, and
      `007_booking_notification_preferences.sql`.
      Local dev is already migrated. Follow [`docs/12_DEPLOYMENT.md`](docs/12_DEPLOYMENT.md) §6.

---

## Medium priority

- [ ] Guest reviews API + real reviews (UI section already present).
- [ ] Expand automated tests (a real runner; `npm run test:bookings` is currently
      a standalone smoke script that needs a running server).
- [ ] Consider `UNIQUE (id, hotel_id)` on `rooms` so `bookings.room_id` can carry a
      composite FK instead of application-level hotel consistency checks
      (needs schema-change approval).
- [ ] Reconcile Aurelia Grand's seed `hotel_media` URLs with `Photos/Aurelia-Grand/**`
      (Zaarang Inn done 2026-08-02; Aurelia still renders via filesystem fallback).
- [ ] Migrate room-card package copy from `lib/tariffs.js` into DB/metadata.

---

## Low priority

- [ ] UI design tokens reference in [`docs/10_UI_GUIDELINES.md`](docs/10_UI_GUIDELINES.md).
- [ ] Populate footer policy / social links via hotel `metadata` in seed.
- [ ] Migrate remaining `<img>` to `next/image` where safe.

---

## Technical debt

- [ ] Production object storage / CDN for admin uploads.

---

## Future (roadmap Phases 13–15)

- [x] Phase 11 — Booking Engine completion (cancel, stay modify, prefs, journey
      polish)
- [x] Phase 12 — PMS Lite (Front Desk board, status actions, room status board)
- [x] Phase 13 — CRM Lite first slice (derived guest search + Guest 360)
- [x] Phase 13 — CRM Lite open leads + source-record notes on Guest 360
- [ ] Phase 13 Full CRM (guest master / merge) — only if separately approved
- [ ] Dated follow-up table — only if separately approved
- [x] Phase 14 Lite — schema `008` + admin payment/invoice APIs (no gateway).
      Smoke: `npm run verify:phase14`.
- [x] Phase 14 — admin booking-detail Payments & Invoices UI
- [ ] Phase 14 — live payment gateway / ERP (not in Lite)
- [ ] Phase 15 — Multi-Property SaaS

---

## Completed (pointer)

Phases **1–12** complete; Phase **13** CRM Lite (guest search + 360 + open
leads) shipped — see [`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md).
Remaining: Full CRM / dated follow-ups only if approved; non-local migrate
`005`–`008`; placeholder contacts; Phase 15.
