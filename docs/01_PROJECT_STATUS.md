# 01 — Project Status

> **Status:** Living document · **Last updated:** 2026-08-03  
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
| Booking engine — admin console + inventory rules | ⬜ Phase 10C |
| Deployment docs / prod cutover | ⬜ Pending |

**Roadmap progress:** Phases **1–9** ✅, **10A** ✅, **10B** ✅ · Next:
**Phase 10C** (admin bookings module + per-date inventory rules)

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
- `npm run test:bookings` — 64 checks, self-cleaning. Backend only, no UI yet.

### Phase 10B — Guest Booking UI ✅

- `/book` three-step flow: Select Hotel → Room & Dates → Guest Details, with
  deep links (`/book?hotel=<slug>&room=<slug>`) from hotel room cards.
- Live stay summary using the server's own pricing formula; "Price on request"
  with the published tariff as guidance when a room type has no base price.
- Availability validated against sellable inventory client-side and against the
  API's `409` on submit.
- `/booking/[bookingNumber]` confirmation + contact-verified lookup, `noindex`.
- Loading, validation, error and responsive states across the flow. No backend
  or admin change; no payment gateway.

### Platform foundations ✅

- PostgreSQL schema (`001_initial_schema.sql`) + seed scripts.
- Public reads: hotels, room types, rooms; inquiries write + admin inquiry reads.
- Backend `/health` (server + DB).

---

## 3. In Progress

- None formally in-flight. Next planned work: **Phase 10C**.

---

## 4. Pending / Next Up

1. **Phase 10C** — Admin bookings module (`/admin/bookings`) over the existing
   Phase 10A admin APIs.
2. Per-date allotment, stop-sells and overbooking allowances (Phase 10C/11).
3. Admin Inquiries CRUD UI.
4. Fill deployment guide ([12 — Deployment](12_DEPLOYMENT.md)).
5. Replace placeholder phones/emails before production launch.
6. Phases **11–15** per [13 — Roadmap](13_ROADMAP.md).

---

## 5. Known Issues

| ID | Issue | Severity | Notes |
|----|-------|----------|-------|
| MED-SEED | Aurelia Grand seed `hotel_media` URLs are flat paths whose files moved to `Photos/` | Low | Renders correctly via filesystem fallback; reconcile seed when convenient. Zaarang Inn reconciled 2026-08-02 |
| ROOM-HOTEL | `bookings.room_id` consistency with `hotel_id` is enforced in the application, not by a constraint | Low | A composite FK would need `UNIQUE (id, hotel_id)` on `rooms` — an existing-table change requiring approval |
| CONTACT | Placeholder contact strings in seed/UI | Medium | Replace before launch |
| BASE-PRICE | Every seeded `room_types.base_price` is `0.00`, so booking quotes and recorded booking amounts read "on request" | Medium | Rates currently live only in `tariff_rates` (Phase 9). Set a nightly base price per room type in Admin → Room Types to enable live totals — no code change needed |

---

## 6. Status Log

| Date | Update |
|------|--------|
| 2026-08-04 | Fixed homepage hero regression — brand hero is `/brand-hero.jpg` only; hotel photos stay on `/hotels/[slug]` |
| 2026-08-03 | Phase 10B complete — guest booking flow at `/book`, live stay summary, availability validation, `/booking/[bookingNumber]` confirmation and lookup |
| 2026-08-02 | Phase 10A complete — bookings schema, availability engine, public + admin booking APIs |
| 2026-08-02 | Fixed Zaarang Inn media regression — stock placeholder `hotel_media` rows replaced with its real `Photos/Zaarang-Inn/**` photography; stock-host and cross-hotel fallback guards added |
| 2026-08-02 | Phase 9 complete — tariff_rates schema, admin/public tariff APIs, admin UI |
| 2026-08-02 | Phase 8 complete — API-driven public hotel pages, loading/error states |
| 2026-07-14 | Docs refreshed; roadmap renumbered to Phases 1–15; Phases 1–7 marked complete |
| 2026-07 | Admin modules: hotels, room types, rooms, media; JWT admin console |
| 2026-07 | Public site + inquiry + hardening shipped |
