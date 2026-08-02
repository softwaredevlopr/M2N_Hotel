# TODO — M2N Hotels Active Task Tracker

> **Purpose:** Day-to-day tracker ([`AGENTS.md`](AGENTS.md) §10.1).  
> **Status:** [`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md) ·  
> **Roadmap:** [`docs/13_ROADMAP.md`](docs/13_ROADMAP.md)

---

## Current focus

- [x] **Phase 10A** — Booking Engine Backend Foundation (schema, availability
      engine, public + admin APIs). Backend only, no UI.
- [ ] **Phase 10B** — Booking UI & inventory rules:
  - [ ] Admin `/admin/bookings` module (list, filters, detail, status, room assignment).
  - [ ] Guest booking flow on the public site (replacing inquiry-only).
  - [ ] Availability calendar, per-date allotment, stop-sells, overbooking allowance.
  - [ ] Booking confirmation email / notification.

---

## High priority

- [ ] Admin Inquiries CRUD UI (list/get/patch APIs already exist).
- [ ] Deployment docs — [`docs/12_DEPLOYMENT.md`](docs/12_DEPLOYMENT.md).
- [ ] Replace placeholder contact details before launch.
- [ ] Run `npm run migrate` on every environment for `004_bookings.sql`
      (Phase 10A). Local dev is already migrated and seeded.

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

Phases **1–9** and **10A** complete — see [`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md) and [`docs/history/RELEASE_NOTES.md`](docs/history/RELEASE_NOTES.md).
