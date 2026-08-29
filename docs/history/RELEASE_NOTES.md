# Release Notes

> **Related:** [`../CHANGELOG.md`](../CHANGELOG.md) · [`DECISIONS.md`](DECISIONS.md) · [`../13_ROADMAP.md`](../13_ROADMAP.md)

---

## Conventions

Newest first. Phase numbers match the product roadmap (Phases 1–15).

---

## Unreleased

### Phase 15 — Lite operator billing stub (2026-08-29)

- `GET /api/admin/tenant` — JWT read-only tenant billing summary (safe fields
  only; no `metadata` or timestamps). Tenant resolution per Phase 15 Lite
  (`resolveReadTenantId`): single membership auto-resolve; 403 / 400 / 404 rules;
  `super_admin` defaults to `m2n-hotels` or explicit `tenant_id`.
- `/admin/billing` read-only UI + Billing nav item. No Stripe/Razorpay, checkout,
  plan changes, cancellation, or invoices. No schema change.
- Smoke: `npm run verify:phase15-billing` (22/22); `verify:phase15` (23/23);
  `verify:phase15-onboarding` (27/27); frontend `npm run build`.

### Phase 15 — Lite self-serve onboarding API + admin UI (2026-08-29)

- Public `POST /api/admin/onboarding` — creates tenant, `hotel_admin` owner,
  `owner` membership, and first `draft` hotel in one transaction; returns JWT.
  Rate limit: 10 / 15 min. Unique conflicts → 409 generic message.
- `/admin/onboarding` public signup form; `setAdminSession` → `/admin/dashboard`.
  Login page links to onboarding. No new schema (uses `009`).
- Smoke: `npm run verify:phase15-onboarding`; frontend `npm run build`.

### Phase 15 — Lite tenant isolation (2026-08-22)

- Migration `009_tenancy_lite.sql` — `tenants`, `tenant_memberships`,
  `hotels.tenant_id` with backfill ([ADR-0042](DECISIONS.md)).
- `resolveAdminTenancy` + `assertHotelAccess` on hotel-scoped admin APIs.
- Smoke: `npm run verify:phase15`.

### Phase 14 — Lite booking-detail Payments & Invoices UI (2026-08-20)

- `/admin/bookings/[id]` Payments + Invoices panels over JWT finance APIs.
- Manual ledger record/void/refund; invoice draft/issue/void/reissue.
- No gateway, no schema. Smoke: `npm run build` (frontend) +
  `npm run verify:phase14`.

### Phase 14 — Lite admin payment and invoice APIs (2026-08-19)

- Hotel-scoped JWT ledger and invoice APIs over migration `008`
  ([ADR-0041](DECISIONS.md)).
- Manual payments/refunds/voids; invoice draft/issue/void/reissue.
- Transactional `bookings.payment_status` sync. No UI, no gateway.
- Smoke: `npm run verify:phase14`.

### Phase 14 — Lite payments and invoice schema (2026-08-18)

- `008_booking_payments_and_invoices.sql`: `booking_payments`,
  `booking_invoices`, `hotel_invoice_sequences`.
- [ADR-0041](DECISIONS.md). No application code in the schema commit.

### Phase 13 — CRM Lite open leads on Guest 360 (2026-08-17)

- Open leads = inquiries in `pending` / `contacted` / `quoted` at that hotel
  ([ADR-0040](DECISIONS.md)).
- Guest 360 shows open leads and read-only source-record `admin_notes`; edit
  on existing booking/inquiry detail pages.
- Smoke: `npm run verify:crm`. No schema. No follow-up table.

### Phase 13 — CRM Lite guest search + Guest 360 (2026-08-16)

- Hotel-scoped derived guests from `bookings` + `inquiries` (no schema)
  ([ADR-0039](DECISIONS.md)).
- `GET /api/admin/guests` and `GET /api/admin/guests/profile` (JWT).
- Admin UI: `/admin/guests` and `/admin/guests/profile`.
- Smoke: `npm run verify:crm`. Dated follow-ups, loyalty, and messaging
  providers are out of scope.

### Admin console full-width desktop shell (2026-08-16)

- `AdminGuard` no longer caps the console at `max-w-6xl`. Desktop uses a
  220px sidebar and an expanding main pane ([ADR-0038](DECISIONS.md)).
- Header label next to Logout is “Administrator” (display text only).
- Design language unchanged. No API or schema change.

### Phase 12 — PMS Lite complete (2026-08-14)

- Front Desk board, status actions, and room status board verified
  (`npm run verify:front-desk`). No schema. Housekeeping and folio remain out of
  scope.

### Phase 12 — Front Desk room status board (2026-08-14)

- `/admin/front-desk?view=rooms` lists physical rooms for the selected hotel
  ([ADR-0037](DECISIONS.md)).
- Operational `rooms.status` updates reuse `PATCH /api/admin/rooms/:id`.
- Booking occupancy is joined from today's Front Desk lists and is not
  auto-synced to `rooms.status`.
- Smoke: `npm run verify:front-desk`. No schema.

### Phase 12 — Front Desk check-in / check-out / no-show (2026-08-14)

- `/admin/front-desk` actions reuse `PATCH /api/admin/bookings/:id/status`
  ([ADR-0036](DECISIONS.md)).
- Optional single-room assign on check-in; multi-room stays stay unassigned
  (existing 409).
- Smoke: `npm run verify:front-desk`. No schema.

### Phase 12 — PMS Lite Front Desk first slice (2026-08-14)

- Optional `hotel_id` on `GET /api/admin/bookings/stats`; unscoped totals
  unchanged ([ADR-0035](DECISIONS.md)).
- `/admin/front-desk` hotel-scoped arrivals, departures, and in-house board.
- List filters `check_out_from` / `check_out_to` / `stay_on`. No schema.
- Smoke: `npm run verify:front-desk`.

### Phase 11 — Broader guest journey polish (2026-08-13)

- Durable post-booking handoff to `/booking/[number]?received=1` with session
  auto-verify and a received banner.
- Find-booking entry at `/booking`; hotel-aware Book Now; ContactCTA Book Online
  → `/book`.
- Available-rooms recovery, mobile sticky actions, lookup status/modify polish,
  estimated-total wording, occupancy guard on public create (no schema).

### Phase 11 — Booking notification preferences (2026-08-13)

- Migration `007` — `bookings.notification_preferences` JSONB
  ([ADR-0034](DECISIONS.md)); local migrate applied.
- Optional prefs on create; guest contact-verified update endpoint; admin
  create/PATCH/detail; public/admin payloads include prefs.
- Status/stay-update emails gated by `email_updates`; confirm/cancel always on.
- Minimal UI on `/book`, `/booking/[bookingNumber]`, `/admin/bookings/[id]`.
- Smoke: `npm run verify:notification-prefs`. No SMS/WhatsApp providers.

### Phase 11 — Guest self-service stay modification (2026-08-13)

- Contact-verified `POST /api/bookings/:bookingNumber/modify` + preview
  ([ADR-0033](DECISIONS.md)); reuses `applyBookingStayUpdate`; no schema change.
- Eligible `pending` / `confirmed` only; server-side reprice from `base_price`.
- Booking lookup “Change stay” UI with availability preview + confirm.
- Smoke: `npm run verify:guest-stay-modify`.

### Phase 11 — Admin stay modification (2026-08-12)

- Transactional stay updates on `PATCH /api/admin/bookings/:id`
  (`applyBookingStayUpdate`: exclude-self availability + locked UPDATE)
  ([ADR-0032](DECISIONS.md)); auto-reprice from `base_price`; no schema change.
- Admin booking detail stay editors, availability feedback, confirm before save.
- Smoke: `npm run verify:admin-stay-modify`. Guest self-service modify deferred.

### Phase 11 — Guest self-service booking cancellation (2026-08-12)

- Contact-verified `POST /api/bookings/:bookingNumber/cancel` for
  pending/confirmed stays ([ADR-0031](DECISIONS.md)); existing schema only.
- Booking lookup page confirm UI with optional reason; cancelled state refresh.
- Admin cancel workflow preserved.

### Phase 11 — Admin booking cancellation workflow (2026-08-12)

- `POST /api/admin/bookings/:id/cancel` with optional `cancellation_reason`
  ([ADR-0030](DECISIONS.md)); existing schema only.
- Admin booking detail ConfirmDialog cancel action; status-path cancel retained.
- Smoke covered in `npm run verify:phase10c`.

### Deployment documentation & readiness plan (2026-08-11)

- Full [`docs/12_DEPLOYMENT.md`](../12_DEPLOYMENT.md) readiness guide
  ([ADR-0029](DECISIONS.md)): architecture, env matrix, 005/006 checklist,
  security, rollback, future CI/CD outline.
- No staging/production deploy or non-local migration executed with this release
  note.

### Booking admin_notes — private internal notes (2026-08-11)

- Migration `006_booking_admin_notes.sql` adds nullable `bookings.admin_notes`
  ([ADR-0028](DECISIONS.md)).
- Admin create/detail UI: separate guest special requests vs private internal
  notes; public booking APIs never accept or return `admin_notes`.
- Smoke: `npm run verify:phase10c` (schema + privacy + isolation checks).

### Admin inventory day-edit UI (2026-08-11)

- `/admin/inventory` day click → side panel for allotment / stop-sell /
  overbooking / source; clear override with confirmation.
- Uses existing `PUT`/`DELETE /api/admin/inventory/dates` ([ADR-0027](DECISIONS.md)).
- No schema change; public booking APIs unchanged.

### Admin inventory-date write APIs (2026-08-10)

- JWT `PUT` / `DELETE /api/admin/inventory/dates` for sparse
  `room_type_inventory_dates` upsert and clear ([ADR-0026](DECISIONS.md)).
- Hotel-scoped validation; public booking APIs unchanged; no schema change.
- Smoke: `npm run verify:inventory-dates`. Admin day-edit UI still pending.

### Phase 10I — Persistent room-type inventory dates (2026-08-08)

- Migration `005_room_type_inventory_dates.sql` — sparse stop-sell / allotment /
  overbooking allowance per hotel, room type, and night ([ADR-0025](DECISIONS.md)).
- Booking and inventory availability engines apply the approved night formula;
  missing rows keep Phase 10D physical − sold behaviour.
- Calendar/day responses set `*_supported: true`. Public request bodies unchanged.
- Smoke: `npm run verify:phase10i`. Admin edit UI for date rows still pending.

### Phase 10H — Admin Inquiries CRUD UI (2026-08-06)

- `/admin/inquiries` list + detail over inquiry APIs (JWT for admin reads/writes).
- Search, status filter, pagination, status update, delete with confirmation.
- Public inquiry create unchanged. No schema change.

### Phase 10G — Admin Create Booking Form (2026-08-05)

- `/admin/bookings/new` over existing `POST /api/admin/bookings`.
- Availability check, indicative price summary, notes via `special_requests`,
  confirmation screen. No schema change.

### Phase 10F — Booking Confirmation Email & Notifications (2026-08-05)

- Provider-agnostic email layer (console log without SMTP; nodemailer SMTP when
  configured) with M2N-branded HTML templates for confirmation, cancellation,
  and status updates.
- Non-blocking hooks on public/admin booking create and admin status changes.
- Smoke: `npm run verify:phase10f`. No schema change.

### Phase 10E — Admin Inventory Calendar UI (2026-08-05)

- `/admin/inventory` monthly calendar over Phase 10D
  `GET /api/admin/inventory/calendar`.
- Hotel and room-type filters, prev/next month, day cells with total / booked /
  remaining / occupancy %, green/yellow/red coding.
- Admin nav + dashboard card. No schema or booking-logic changes.

### Phase 10D — Availability & Inventory Engine (2026-08-05)

- New `inventory.service.js` derives per-day sold/remaining counts and stay-peak
  availability matching the booking engine ([ADR-0021](DECISIONS.md)).
- Admin APIs: `/api/admin/inventory/calendar`, `/day`, `/overlaps`.
- Public calendar: `/api/bookings/availability/calendar` (stay-range
  `/availability` unchanged).
- Stop-sell / allotment / overbooking not in schema — flagged unsupported.
- Verified with `npm run verify:phase10d`. No frontend calendar UI yet.

### Phase 10C — Admin Booking Management module (2026-08-04)

- `/admin/bookings` list with search, hotel/status/date filters, pagination and
  sorting; detail page with guest/stay/room/pricing/timeline/notes.
- Status actions: confirm, cancel, check-in, check-out, no-show (transition-
  guarded) plus room assignment for single-room stays.
- Dashboard booking statistics via `GET /api/admin/bookings/stats`.
- List API gains `sort` / `order` ([ADR-0020](DECISIONS.md)). No schema change.
- Verified 2026-08-05: auth gate, filters, status + `cancellation_reason`,
  frontend build; no_show stamps `cancelled_at`. Script: `npm run verify:phase10c`.
- Remaining: calendar/allotment/stop-sells, confirmation email, dedicated
  internal notes, admin create form.

### Fix — Original homepage brand-hero.jpg restored from Git (2026-08-04)

- Previous wrong path: logo-only hero (`/m2n-logo-tagline.png` atmosphere).
- Restored `/brand-hero.jpg` byte-identical from commit `336582d`
  ([ADR-0018](DECISIONS.md)).
- Hotel detail heroes unchanged.

### Fix — Homepage brand hero asset replaced (2026-08-04)

- Traced rendered homepage hero to `url(/brand-hero.jpg)`. That file was stock
  coastal-resort photography (not real Zaarang Exterior files, but still wrong
  for a brand surface). Deleted it.
- Homepage hero became M2N logo mark + brand atmosphere only
  ([ADR-0017](DECISIONS.md)). **Superseded** by the Git restore above.

### Fix — Homepage brand hero restored (2026-08-04)

- Earlier code-path fix (stop selecting featured-hotel media) —
  [ADR-0016](DECISIONS.md).

### Phase 10B — Guest Booking UI five-step + availability API (2026-08-04)

- `/book` is a five-step reservation flow — Stay Details → Available Rooms →
  Guest Details → Review → Confirmation — with modular components and a live
  stay summary.
- New public `GET /api/bookings/availability` returns date-aware inventory and
  indicative amounts for each active room type ([ADR-0019](DECISIONS.md)).
- Hotel hero / sticky “Book Now” and room-card CTAs deep-link into `/book` with
  `hotel` / `room` query params. Inquiry form unchanged.
- Submit uses `POST /api/bookings`; confirmation shows booking reference/status
  with Back to Home and View Hotel. Lookup at `/booking/[bookingNumber]` remains.
- No schema change, no payment gateway. Quotes stay “on request” until room-type
  `base_price` is set.

### Phase 10B — Guest Booking UI (2026-08-03)

- Initial three-step `/book` flow and `/booking/[bookingNumber]` lookup (superseded
  for the flow shape by the 2026-08-04 five-step release above).
- Frontend helpers and pricing rules ([ADR-0015](DECISIONS.md)).

### Phase 10A — Booking Engine Backend Foundation (2026-08-02)

- `bookings` table (migration `004`) with unique human-readable booking numbers,
  multi-property `hotel_id` scoping, booking/payment status and source
  constraints, amounts, and audit stamps.
- Public `POST /api/bookings` and contact-verified
  `GET /api/bookings/:bookingNumber`; admin JWT list, detail, create, update,
  status and room-assignment endpoints.
- Overbooking protection: per-night peak occupancy inside a transaction with an
  advisory lock per hotel + room type ([ADR-0014](DECISIONS.md)).
- `npm run test:bookings` — 64 checks, self-cleaning.
- No frontend booking pages yet (Phase 10B), and no payments, OTA or channel
  manager.

### Fix — Hotel Zaarang Inn real photography restored (2026-08-02)

- Zaarang Inn's `hotel_media` rows were seeded stock Unsplash placeholders that, after
  the Phase 8 API-first switch, outranked its real `Photos/Zaarang-Inn/**` images.
- Seed now builds Zaarang's 17 media rows from its own photo folders; the 4 stock rows
  were set to `inactive` (nothing deleted). Hero is `Photos/Zaarang-Inn/Hero/1.jpg`.
- Stock/demo image hosts are now rejected outright, and hotel-level image fallbacks stay
  inside the hotel's own folder ([ADR-0013](DECISIONS.md)). Aurelia Grand unchanged.

### Phase 9 — Tariff & Rate Management (2026-08-02)

- `tariff_rates` schema, public `GET /api/tariffs`, admin CRUD, `/admin/tariffs` UI.
- Public matrix uses API; empty price cells show “Available with room plan”.

### Phase 8 — Public Website Dynamic Integration (2026-08-02)

- Hotel detail pages driven by `GET /api/hotels/:slug`, `GET /api/rooms/types`, and inquiry API.
- API-first media, amenities, contact, policies; loading/error states on public routes.
- Meal-plan tariff matrix still from `lib/tariffs.js` until Phase 9.

### Documentation
- Roadmap consolidated to Phases 1–15; docs suite refreshed (README, status, API, DB, architecture).

### Next engineering target
- **Phase 10** — Availability & inventory.

---

## Platform milestone — Phases 1–9 complete (2026-08)

### Highlights
- Public multi-hotel website with premium hotel detail pages.
- Booking inquiry pipeline end-to-end.
- JWT admin console managing hotels, room types, rooms, and media.
- PostgreSQL-backed REST API with security baseline (Helmet, CORS, rate limits).

### Phase-by-phase

| Phase | Delivered |
|-------|-----------|
| 1 Public Website | Multi-hotel Next.js site, Photos folders, SEO, detail UX |
| 2 Booking Inquiry | `InquiryForm` → `POST /api/inquiries` |
| 3 Admin Authentication | `admin_users`, JWT login, `/admin` shell |
| 4 Hotel Management | `/admin/hotels` + `/api/admin/hotels` |
| 5 Room Type Management | `/admin/room-types` + `/api/admin/room-types` |
| 6 Rooms Management | `/admin/rooms` + `/api/admin/rooms` |
| 7 Hotel Media Management | `/admin/media` + `/api/admin/media` upload |

### Notes
- Public GET contracts for hotels/rooms were kept stable while admin write APIs were added.
- Some features encode extras without schema changes (room-type featured in `metadata`,
  media categories in upload URL paths).

---

## Earlier work (folded into Phase 1)

- Hotel-wise image architecture and slug routing.
- Production launch hardening (SEO, security, a11y, performance).
- Tariff/meal-plan UI iterations driven by `lib/tariffs.js` (pending Phase 9 for DB rates).
