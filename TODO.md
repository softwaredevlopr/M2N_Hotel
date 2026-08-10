# TODO — M2N Hotels Active Task Tracker

> **Purpose:** Day-to-day tracker ([`AGENTS.md`](AGENTS.md) §10.1).  
> **Status:** [`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md) ·  
> **Roadmap:** [`docs/13_ROADMAP.md`](docs/13_ROADMAP.md)

---

## Current focus

- [x] **Phase 10A** — Booking Engine Backend Foundation (schema, availability
      engine, public + admin APIs). Backend only, no UI.
- [x] **Phase 10B** — Guest booking UI (`/book` five-step flow, availability API,
      live stay summary, review + confirmation, `/booking/[bookingNumber]`
      lookup). Hotel/room CTAs deep-link to `/book`; inquiry form preserved.
      No payment gateway.
- [x] **Phase 10C (module verified 2026-08-05)** — Admin bookings module
      (`/admin/bookings` list, filters, pagination, sorting, detail, status
      actions, room assignment) + dashboard booking stats. No schema change.
      Smoke: `npm run verify:phase10c` / `npm run test:bookings`.
  - [ ] Dedicated internal-notes column (needs schema approval).
- [x] **Phase 10D — Availability & Inventory Engine** — derived per-day
      inventory service + calendar/day/overlaps APIs (admin + public calendar).
      Smoke: `npm run verify:phase10d`.
- [x] **Phase 10I — Persistent inventory dates** — migration `005`
      (`room_type_inventory_dates`), stop-sell / allotment / overbooking in
      booking + inventory services. Public request bodies unchanged. Smoke:
      `npm run verify:phase10i`.
  - [x] Admin write APIs — `PUT`/`DELETE /api/admin/inventory/dates`
        (upsert + clear). Smoke: `npm run verify:inventory-dates`.
  - [ ] Admin UI day-edit on `/admin/inventory` over those write APIs.
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
- [ ] Deployment docs — [`docs/12_DEPLOYMENT.md`](docs/12_DEPLOYMENT.md).
- [ ] Replace placeholder contact details before launch.
- [ ] Run `npm run migrate` on every environment for `004_bookings.sql` and
      `005_room_type_inventory_dates.sql`. Local dev is already migrated.

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

## Future (roadmap Phases 11–15)

- [ ] Phase 11 — Booking Engine completion (confirmations, self-service changes)
- [ ] Phase 12 — PMS Lite
- [ ] Phase 13 — CRM
- [ ] Phase 14 — Payments & Invoice
- [ ] Phase 15 — Multi-Property SaaS

---

## Completed (pointer)

Phases **1–9**, **10A–10H** complete (admin inquiries UI) — see
[`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md). Remaining: stop-sell
schema (approval), booking internal notes, deployment.
