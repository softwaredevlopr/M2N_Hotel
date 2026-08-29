# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Phase numbers below match [`13_ROADMAP.md`](13_ROADMAP.md) (consolidated 2026-07-14).

---

## [Unreleased]

### Added — Phase 15 Lite operator billing stub (API + admin UI) ✅

- **What changed.** Read-only operator billing summary for authenticated admins.
  `GET /api/admin/tenant` returns safe tenant fields only (no `metadata`,
  `created_at`, or `updated_at`). Tenant resolution reuses Phase 15 Lite
  conventions: single membership auto-resolve; zero memberships → 403; multiple
  memberships require `?tenant_id=` or 400; cross-tenant `tenant_id` → 404;
  `super_admin` defaults to `m2n-hotels` when omitted, or may pass `tenant_id`
  explicitly. Frontend `/admin/billing` shows plan, subscription/account status,
  billing email, trial end, and current period end with a read-only notice that
  payment gateway / plan changes are future work. Billing nav item added. No
  Stripe/Razorpay, checkout, plan mutation, cancellation, or invoices UI. No
  schema change.
- **Files modified:** `adminTenant.controller.js`, `adminTenant.routes.js`,
  `adminTenancy.js` (`resolveReadTenantId`), `routes/index.js`,
  `verifyPhase15Billing.js`, `package.json`, `frontend/src/lib/adminTenant.js`,
  `frontend/src/app/admin/(protected)/billing/page.js`,
  `frontend/src/components/admin/AdminGuard.js`, `StatusBadge.js`, docs.
- **APIs added/changed:** `GET /api/admin/tenant` (JWT + `resolveAdminTenancy`;
  optional `?tenant_id=`). Response fields: `id`, `name`, `slug`, `status`,
  `plan_code`, `subscription_status`, `trial_ends_at`, `current_period_end`,
  `billing_email`. GET-only.
- **Database changes:** none.
- **Frontend changes:** `/admin/billing` read-only page; `getAdminTenant()` client.
- **Backend changes:** tenant summary controller + verifier
  (`verify:phase15-billing` — 22/22 passed).
- **Remaining work:** live SaaS payment gateway / subscription management (out of
  Lite); non-local migrate `005`–`009`; placeholder contacts.

### Added — Phase 15 Lite self-serve onboarding (API + admin UI) ✅

- **What changed.** Public self-serve operator onboarding: backend
  `POST /api/admin/onboarding` creates tenant, `hotel_admin` owner,
  `tenant_memberships` (`owner`), and first `draft` hotel in one transaction;
  returns JWT session data. Frontend `/admin/onboarding` matches admin login
  styling; successful signup stores the existing admin session and redirects to
  `/admin/dashboard`. Login page links to onboarding and vice versa. No new schema
  in this slice (uses migration `009`).
- **Files modified:** `adminOnboarding.controller.js`, `adminOnboarding.routes.js`,
  `adminOnboarding.validator.js`, `routes/index.js`, `server.js`,
  `verifyPhase15Onboarding.js`, `package.json`, `frontend/src/lib/api.js`,
  `frontend/src/app/admin/onboarding/page.js`, `frontend/src/app/admin/login/page.js`,
  docs.
- **APIs added/changed:** `POST /api/admin/onboarding` (public, 10 req / 15 min).
  Unique conflicts → 409 generic message. Success 201:
  `{ tenant, admin, hotel, access_token, token_type, expires_in }`.
- **Database changes:** none (transactional inserts into existing `009` tables).
- **Frontend changes:** `/admin/onboarding` form
  (`tenant_name`, `tenant_slug`, `owner_name`, `owner_email`, `owner_password`,
  `hotel_name`, `hotel_slug`, optional `city`/`state`/`country`/`phone`);
  `adminOnboard()` client; slug auto-fill via `slugifyHotelName`.
- **Backend changes:** onboarding controller + validator + rate limiter.
- **Remaining work:** live payment gateway out of scope; non-local migrate
  `005`–`009`; placeholder contacts.

### Added — Phase 15 Lite tenant isolation (migration `009` + AuthZ) ✅

- **What changed.** Multi-tenant operator boundary: migration `009_tenancy_lite.sql`
  (`tenants`, `tenant_memberships`, `hotels.tenant_id` + backfill). Admin JWT
  routes use `resolveAdminTenancy` + `assertHotelAccess` — `hotel_admin` users
  may access only hotels under their tenant membership; cross-tenant access
  returns **404**; `super_admin` bypasses for platform support. Lite model: one
  membership grants all hotels of that tenant (no per-hotel ACL).
- **Files modified:** `009_tenancy_lite.sql`, `adminTenancy.js`,
  `resolveAdminTenancy` middleware, hotel-scoped admin handlers, `verifyPhase15.js`,
  `verifyTenancySchema.js`, `package.json`, docs ([ADR-0042](history/DECISIONS.md)).
- **APIs added/changed:** no new public routes; existing admin routes enforce
  tenant membership on `hotel_id` scope.
- **Database changes:** migration `009` (additive + non-destructive backfill).
- **Frontend changes:** none in this slice.
- **Backend changes:** tenancy middleware and route hardening.
- **Remaining work:** operator billing stub (follow-up slice above); gateway out
  of scope.

### Added — Phase 14 Lite admin booking-detail Payments & Invoices UI ✅

- **What changed.** Booking detail (`/admin/bookings/[id]`) now includes
  Payments and Invoices panels over the committed Phase 14 JWT APIs. Staff can
  see balances, record cash/card/UPI/bank/other ledger entries, void mistaken
  rows, and draft/issue/void/reissue invoices. No gateway, no ERP, no schema
  change.
- **Files modified:** `adminBookingFinance.js`, `BookingPaymentsPanel.js`,
  `BookingInvoicesPanel.js`, `bookings/[id]/page.js`, `StatusBadge.js`, docs.
- **APIs added/changed:** none (consumes existing nested finance routes).
- **Database changes:** none.
- **Frontend changes:** finance panels on booking detail; hotel_id scoped to
  the loaded booking.
- **Backend changes:** none.
- **Remaining work:** live gateway / ERP out of Lite; non-local migrate
  `005`–`008`; placeholder contacts; Phase 15.

### Added — Phase 14 Lite admin payment and invoice APIs ✅

- **What changed.** Admin JWT APIs record a hotel-scoped manual payment ledger
  and invoice draft/issue/void/reissue flows over migration `008`. Ledger
  writes and invoice issue/void sync `bookings.payment_status` in the same
  transaction. No frontend, no live payment gateway, no ERP.
- **Files modified:** `adminBooking.routes.js`, `adminBookingPayment.controller.js`,
  `adminBookingInvoice.controller.js`, `bookingPayment.service.js`,
  `bookingInvoice.service.js`, `bookingFinanceShared.js`,
  `bookingFinance.validator.js`, `bookingFinanceConstants.js`, `invoiceNumber.js`,
  `verifyPhase14.js`, `package.json`, docs.
- **APIs added/changed:** JWT nested routes under
  `/api/admin/bookings/:id/payments` and `/api/admin/bookings/:id/invoices`
  (required `hotel_id` query). Existing public and admin booking contracts
  unchanged.
- **Database changes:** none in this slice (uses `008` already applied).
- **Frontend changes:** none.
- **Backend changes:** append-only ledger (`payment` / `refund`, void-only
  corrections); invoice snapshot on issue; slug-derived
  `{HOTEL_CODE}-{YYYY}-{SEQ6}` numbers via `hotel_invoice_sequences`.
- **Remaining work:** Phase 14 admin finance UI; no gateway/ERP in Lite;
  non-local migrate `005`–`008`; placeholder contacts; Phase 15.

### Added — Phase 14 Lite payments and invoice schema foundation ✅

- **What changed.** Additive migration `008_booking_payments_and_invoices.sql`
  plus [ADR-0041](history/DECISIONS.md). No application/API/frontend in that
  schema-only commit.
- **Files modified:** `008_booking_payments_and_invoices.sql`,
  `docs/history/DECISIONS.md` (documented here with the API follow-up).
- **APIs added/changed:** none in the schema-only commit.
- **Database changes:** `hotel_invoice_sequences`, `booking_invoices`,
  `booking_payments`. `bookings.payment_status` CHECK unchanged.
- **Frontend changes:** none.
- **Backend changes:** schema only.
- **Remaining work:** application APIs (this slice, above); admin UI; gateway
  out of scope.

### Added — Phase 13 CRM Lite open-leads visibility on Guest 360 ✅

- **What changed.** Guest 360 now surfaces hotel-scoped open leads from
  existing inquiries in `pending`, `contacted`, or `quoted`, plus read-only
  source-record `admin_notes`. Notes are edited only on existing booking and
  inquiry detail pages. No follow-up table, no guest master, no new writes.
- **Files modified:** `crmGuest.service.js`, `verifyCrm.js`, `guests/page.js`,
  `guests/profile/page.js`, docs.
- **APIs added/changed:** `GET /api/admin/guests` rows include
  `open_lead_count`. `GET /api/admin/guests/profile` adds
  `summary.open_lead_count`, `open_leads[]`, and `staff_notes[]`.
- **Database changes:** none.
- **Frontend changes:** Guest 360 open-leads table and staff-notes panel
  (read-only, links to detail pages); guests list shows an open-lead count.
- **Backend changes:** derived counts/lists from existing inquiry statuses and
  `admin_notes`. Public APIs unchanged.
- **Remaining work:** Full CRM (guest master / merge) only if separately
  approved; no dated follow-up table until approved; Phases 14–15; non-local
  migrate `005`–`007`; placeholder contacts.

### Added — Phase 13 CRM Lite derived guest search + Guest 360 ✅

- **What changed.** Hotel-scoped admin guest directory and Guest 360 over
  existing `bookings` and `inquiries`. No `guests` table, no migration, no
  write APIs. Identity is computed at read time: primary `email:` +
  `lower(trim(guest_email))`; phone last-10 only when email is empty. Different
  emails are never merged, even when phones match. Repeat guest = two or more
  bookings at that hotel. Stay count = `checked_in` / `checked_out`.
- **Files modified:** `crmGuest.service.js`, `adminGuest.controller.js`,
  `adminGuest.routes.js`, `routes/index.js`, `verifyCrm.js`, `package.json`,
  `adminGuests.js`, `guests/page.js`, `guests/profile/page.js`, `AdminGuard.js`,
  `dashboard/page.js`, docs.
- **APIs added/changed:** `GET /api/admin/guests` (JWT, required `hotel_id`,
  optional `q`/`limit`/`offset`); `GET /api/admin/guests/profile` (JWT,
  required `hotel_id` + `key`).
- **Database changes:** none.
- **Frontend changes:** `/admin/guests` (hotel required, search, pagination,
  Repeat badge, View 360); `/admin/guests/profile` (contact, summary, booking
  and inquiry history with links to existing detail pages); nav + dashboard
  card.
- **Backend changes:** read-only `crmGuest.service.js` groups source rows per
  `hotel_id` + identity key. Public booking/inquiry APIs unchanged.
- **Remaining work:** rest of CRM Lite (open-leads visibility via existing
  inquiry statuses/notes — no dated follow-up table until separately
  approved); Phases 14–15; non-local migrate `005`–`007`; placeholder contacts.

### Fixed — Admin console uses full desktop viewport width ✅

- **What changed.** The shared admin shell no longer caps header and content at
  `max-w-6xl` (~1152px). Desktop layout uses the full available width: a fixed
  220px sidebar from `lg` up, and a `minmax(0,1fr)` main pane so tables and
  cards expand without page-level overflow. Visual language (colors, type,
  cards, nav) is unchanged. Form/intro readability max-widths on individual
  pages are unchanged.
- **Files modified:** `frontend/src/components/admin/AdminGuard.js`,
  `docs/10_UI_GUIDELINES.md`, `docs/02_ARCHITECTURE.md`,
  `docs/01_PROJECT_STATUS.md`, `docs/08_AI_CONTEXT.md`,
  `docs/history/DECISIONS.md`, `docs/history/RELEASE_NOTES.md`,
  `PROJECT_DOCS.md`, `docs/CHANGELOG.md`.
- **APIs added/changed:** none.
- **Database changes:** none.
- **Frontend changes:** `AdminGuard` header and body drop `max-w-6xl mx-auto`;
  main gets `min-w-0`; sidebar stays 220px on `lg+`. Below `lg`, nav still
  stacks above content. Header label next to Logout is the static text
  “Administrator” (display only; stored profile name unchanged).
- **Backend changes:** none.
- **Remaining work:** Phases 13–15; non-local migrate `005`–`007`; placeholder
  contacts. Ultra-wide form pages still use their existing `max-w-3xl` for
  readability (intentional).

### Verified — Phase 12 PMS Lite complete ✅

- **What changed.** End-to-end audit of Front Desk (hotel-scoped stats, arrivals /
  departures / in-house, check-in / check-out / no-show, room assignment/change,
  room status board). No product changes. No schema/migrations.
- **Files modified:** `verifyFrontDesk.js` (assign/reassign + cross-hotel assign
  checks); status docs.
- **APIs added/changed:** none.
- **Database changes:** none.
- **Frontend changes:** none in this verification pass.
- **Backend changes:** none beyond verifier coverage.
- **Remaining work:** Phases 13–15; non-local migrate `005`–`007`; placeholder
  contacts.

### Added — Phase 12 Front Desk room status board ✅

- **What changed.** `/admin/front-desk` adds an Operations / Room status panel
  (`?view=rooms`) for the selected hotel. Physical rooms come from
  `GET /api/admin/rooms?hotel_id=`. Operational `rooms.status` updates send
  `{ status }` only to existing `PATCH /api/admin/rooms/:id` (valid statuses
  only). Today's assigned booking, guest name, and arrival/departure/in-house
  chips are joined from Front Desk booking lists — occupancy is not auto-synced
  to `rooms.status`. No schema, housekeeping, or folio.
- **Files modified:** `FrontDeskRoomBoard.js`, `front-desk/page.js`,
  `adminBookings.js`, `verifyFrontDesk.js`, `00_PROJECT_OVERVIEW.md`, docs.
- **APIs added/changed:** none (reuses rooms list/PATCH + existing Front Desk
  booking lists).
- **Database changes:** none.
- **Frontend changes:** hotel-scoped room board on Front Desk; status vs occupancy
  columns; mismatch notes.
- **Backend changes:** none beyond Front Desk verifier coverage for rooms APIs.
- **Remaining work:** Phases 13–15; non-local migrate `005`–`007`; placeholder
  contacts.

### Added — Phase 12 Front Desk check-in / check-out / no-show ✅

- **What changed.** Front Desk rows can check in, check out, and mark no-show
  through existing `PATCH /api/admin/bookings/:id/status` and the same
  transition rules as booking detail. Optional single-room assignment on
  check-in reuses assign-room (409 for multi-room / unassignable rooms).
  Lists refresh after success; hotel selection is preserved. No schema.
- **Files modified:** `front-desk/page.js`, `adminBookings.js`,
  `verifyFrontDesk.js`, docs.
- **APIs added/changed:** none (reuses status + assign-room).
- **Database changes:** none.
- **Frontend changes:** Front Desk action buttons + confirm dialogs.
- **Backend changes:** none beyond Front Desk verifier coverage.
- **Remaining work:** room status board; Phases 13–15; non-local migrate
  `005`–`007`; placeholder contacts.

### Added — Phase 12 PMS Lite Front Desk (first slice) ✅

- **What changed.** Optional `hotel_id` on `GET /api/admin/bookings/stats`
  (unscoped behaviour unchanged). Front Desk board at `/admin/front-desk`
  requires a hotel, then shows hotel-scoped stats plus today's arrivals,
  departures, and in-house guests from existing booking APIs. Backward-compatible
  list filters `check_out_from` / `check_out_to` / `stay_on` support those
  lists. No schema change; no second reservation system.
- **Files modified:** `adminBooking.controller.js`, `verifyFrontDesk.js`,
  `verifyPhase10C.js`, `adminBookings.js`, `AdminGuard.js`, dashboard page,
  `front-desk/page.js`, `package.json`, docs.
- **APIs added/changed:** `GET /api/admin/bookings/stats?hotel_id=` (optional
  UUID; invalid → 400). `GET /api/admin/bookings` accepts `check_out_from`,
  `check_out_to`, `stay_on`.
- **Database changes:** none.
- **Frontend changes:** `/admin/front-desk` ops board; nav + dashboard link.
- **Backend changes:** hotel-scoped stats SQL; list date overlap filters.
- **Remaining work:** room status board; Phases
  13–15; non-local migrate `005`–`007`; placeholder contacts.

### Added — Phase 11 broader guest journey polish ✅

- **What changed.** Post-booking redirects to contact-verified lookup with a
  received banner. Available-rooms empty/preferred-unavailable recovery, mobile
  sticky actions, lookup status/modify polish, hotel-aware Book Now, ContactCTA
  Book Online → `/book`, estimated-total wording, `/booking` find-reservation
  entry, and occupancy guard (client + public create validation). No schema
  change.
- **Files modified:** `BookingFlow.js`, `BookingConfirmation.js`,
  `AvailableRoomsStep.js`, `BookingLookup.js`, `BookingReviewStep.js`,
  `FindBookingForm.js`, `book/page.js`, `booking/page.js`,
  `booking/[bookingNumber]/page.js`, `Navbar.js`, `Footer.js`, `ContactCTA.js`,
  `bookingPricing.js`, `booking.controller.js`, docs.
- **APIs added/changed:** public `POST /api/bookings` rejects guest counts over
  `max_occupancy × rooms`.
- **Database changes:** none.
- **Frontend changes:** durable confirmation handoff, find-booking page, CTA
  and wording consistency, mobile book chrome, lookup polish.
- **Backend changes:** occupancy validation on public create.
- **Remaining work:** Phases 12–15; non-local migrate `005`–`007`; placeholder
  contacts.

### Added — Phase 11 booking notification preferences ✅

- **What changed.** Migration `007` adds `bookings.notification_preferences`
  JSONB (`email_updates`, `sms_opt_in`, `whatsapp_opt_in`; defaults
  true/false/false). Transactional confirm/cancel emails remain ungated;
  optional status/stay-update emails respect `email_updates`. Optional prefs
  on create; contact-verified guest
  `POST …/notification-preferences`; admin create/PATCH/payloads include
  prefs. Minimal controls on `/book`, booking lookup, and admin booking detail.
  SMS/WhatsApp providers, marketing, and CRM profiles are out of scope.
- **Files modified:** `007_booking_notification_preferences.sql`,
  `notificationPreferences.js`, `bookingNotification.service.js`,
  `booking.service.js`, `booking.controller.js`, `adminBooking.controller.js`,
  `booking.routes.js`, `booking.validator.js`, `GuestDetailsStep.js`,
  `BookingFlow.js`, `BookingReviewStep.js`, `BookingLookup.js`,
  admin bookings `[id]/page.js`, `api.js`, `verifyNotificationPrefs.js`,
  `package.json`, docs.
- **APIs added/changed:** `POST /api/bookings/:bookingNumber/notification-preferences`;
  create/lookup/admin booking payloads include `notification_preferences`;
  optional prefs on public/admin create; admin PATCH can update prefs.
- **Database changes:** migration `007` — additive JSONB column (local applied).
- **Frontend changes:** guest preference toggles on book + lookup; admin detail
  preference controls.
- **Backend changes:** normalize/validate helpers; status-update email gate.
- **Remaining work:** Phases 12–15; non-local migrate `007` when deploying.

### Added — Phase 11 guest self-service stay modification ✅

- **What changed.** Contact-verified
  `POST /api/bookings/:bookingNumber/modify` and
  `…/modify/preview` let guests change dates / room type / room count on
  `pending` / `confirmed` bookings. Reuses `applyBookingStayUpdate` (exclude-self
  availability + locked UPDATE). Pricing always recalculated from `base_price`.
  `/booking/[bookingNumber]` adds change-stay UI with preview + confirm.
  No schema change. Admin stay modify and guest cancel unchanged.
- **Files modified:** `booking.controller.js`, `booking.routes.js`,
  `booking.validator.js`, `bookingConstants.js`, `booking.service.js`,
  `BookingLookup.js`, `api.js`, `verifyGuestStayModify.js`, docs.
- **APIs added:** `POST /api/bookings/:bookingNumber/modify`,
  `POST /api/bookings/:bookingNumber/modify/preview`.
- **Database changes:** none.
- **Frontend changes:** stay modify panel on booking lookup.
- **Backend changes:** `canGuestModifyStayBooking`; guest allowedStatuses on
  `applyBookingStayUpdate`.
- **Remaining work:** notification prefs; journey polish; commit/push.

### Added — Phase 11 admin stay modification (transactional) ✅

- **What changed.** Admin `PATCH /api/admin/bookings/:id` stay changes
  (check-in, check-out, room type, number of rooms) now revalidate the full
  revised stay and `UPDATE` inside one locked transaction
  (`applyBookingStayUpdate`), excluding the booking’s own inventory hold.
  Amounts auto-recalculate from `room_types.base_price` unless amounts are
  sent explicitly. Terminal statuses rejected. `/admin/bookings/[id]` adds
  stay editors, availability check (overlaps + exclude self), and confirm
  before save. Guest self-service modify not implemented. No schema change.
- **Files modified:** `booking.service.js`, `adminBooking.controller.js`,
  `bookingConstants.js`, admin booking detail UI, `adminBookings.js`,
  `adminInventory.js`, `verifyAdminStayModify.js`, docs.
- **APIs changed:** `PATCH /api/admin/bookings/:id` stay path hardened +
  auto-reprice.
- **Database changes:** none.
- **Frontend changes:** stay edit + availability feedback + confirm on
  booking detail.
- **Backend changes:** `applyBookingStayUpdate`; `canModifyStayBooking`.
- **Remaining work:** guest stay modification; notification prefs; commit/push.

### Added — Phase 11 guest self-service booking cancellation ✅

- **What changed.** Contact-verified
  `POST /api/bookings/:bookingNumber/cancel` lets guests cancel `pending` /
  `confirmed` bookings using existing `cancelled` + optional
  `cancellation_reason` (no schema change). `/booking/[bookingNumber]` adds a
  confirm step with optional reason and refreshes to the cancelled state.
  Wrong contact returns the same 404 as lookup; duplicate cancel returns 400.
  Admin cancel workflow unchanged. Public payloads may include
  `cancellation_reason`; never `admin_notes`.
- **Files modified:** `booking.routes.js`, `booking.controller.js`,
  `booking.validator.js`, `bookingConstants.js`, `BookingLookup.js`, `api.js`,
  `bookingSession.js`, `verifyPhase10C.js`, docs.
- **APIs added:** `POST /api/bookings/:bookingNumber/cancel`.
- **Database changes:** none.
- **Frontend changes:** cancel confirm UI on booking lookup page.
- **Backend changes:** guest cancel handler + `canGuestCancelBooking`.
- **Remaining work:** admin stay modification UI/harden; guest stay modify;
  notification prefs; commit/push.

### Added — Phase 11 admin booking cancellation workflow ✅

- **What changed.** Dedicated JWT `POST /api/admin/bookings/:id/cancel` cancels
  eligible bookings using existing `booking_status=cancelled` and optional
  `cancellation_reason` (no schema change). Admin booking detail uses a confirm
  dialog with optional reason, then refreshes booking state. Status-path cancel
  and no-show flows remain. No guest self-service cancel / stay modify yet.
- **Files modified:** `adminBooking.routes.js`, `adminBooking.controller.js`,
  `booking.validator.js`, `bookingConstants.js`, admin booking detail UI +
  `adminBookings.js`, `verifyPhase10C.js`, docs.
- **APIs added:** `POST /api/admin/bookings/:id/cancel`.
- **Database changes:** none.
- **Frontend changes:** Cancel booking action + ConfirmDialog (optional reason).
- **Backend changes:** cancel handler + `canCancelBooking` helper.
- **Remaining work:** guest self-service cancel/modify; notification prefs;
  staging cutover; commit/push this work.

### Added — Deployment documentation & readiness plan ✅

- **What changed.** Replaced the stub [`docs/12_DEPLOYMENT.md`](12_DEPLOYMENT.md)
  with a full readiness guide: architecture, env matrix (placeholders only),
  backend/frontend/Postgres procedures, safe 005/006 rollout checklist,
  security + pre-production checklists, rollback guidance, and a future CI/CD
  outline. No staging/production deploy or non-local migrate was performed.
- **Files modified:** `docs/12_DEPLOYMENT.md`, `docs/06_SETUP_GUIDE.md`,
  `backend/.env.example`, `frontend/.env.example` (+ allowlist in
  `frontend/.gitignore`), status/TODO/changelog/ADR.
- **APIs added/changed:** none.
- **Database changes:** none.
- **Frontend changes:** none (docs / env example only).
- **Backend changes:** none (docs / env example only).
- **Remaining work:** commit/push docs; operator-run non-local migrate
  `005`/`006`; provision hosts/secrets; placeholder contacts; optional CI/CD.

### Added — Booking admin_notes (private internal notes) ✅

- **What changed.** Approved migration `006_booking_admin_notes.sql` adds
  nullable `bookings.admin_notes TEXT` for private hotel/admin staff notes.
  Admin create/update/detail/list expose it; public booking create rejects it;
  public lookup/availability responses and guest emails never include it.
  `special_requests` and `cancellation_reason` keep their existing roles. Admin
  UI splits guest requests vs internal notes on detail and create forms.
- **Files created:** `backend/migrations/006_booking_admin_notes.sql`.
- **Files modified:** `booking.service.js`, `adminBooking.controller.js`,
  `booking.controller.js`, `booking.validator.js`, `verifyPhase10C.js`,
  admin booking detail/create UI + `adminBookings.js`, docs/TODO/ADR.
- **APIs added/changed:** admin booking create/update/read include
  `admin_notes`; public create returns 400 if `admin_notes` is sent.
- **Database changes:** `ALTER TABLE bookings ADD COLUMN admin_notes TEXT`
  (nullable; no index; existing rows NULL).
- **Frontend changes:** separate Internal notes field on create + detail.
- **Backend changes:** admin field projection + validation; public privacy guard.
- **Remaining work:** commit/push; run `006` on non-local envs; deployment docs.

### Fixed — Inventory day-edit override presence + source on day GET ✅

- **What changed.** Day/calendar inventory payloads now include `has_override`,
  `override_id`, and persisted `source` from `room_type_inventory_dates` so the
  admin day-edit UI can distinguish no-row vs defaults-only vs custom overrides.
  Clear is offered only when `has_override` is true. No schema change; public
  request bodies unchanged.
- **Files modified:** `inventoryCapacity.js`, `inventory.service.js`,
  `adminInventory.js`, inventory day-edit UI components/page,
  `verifyInventoryDateWrites.js`, docs.
- **APIs changed:** day/calendar day objects gain additive fields
  (`has_override`, `override_id`, `source`).
- **Database changes:** none.
- **Frontend changes:** Clear gated on persisted row; state copy updated.
- **Backend changes:** override loader selects `id` + `source`.
- **Remaining work:** commit this fix; booking internal-notes; deployment.

### Added — Admin inventory day-edit UI ✅

- **What changed.** `/admin/inventory` day click opens a side panel to upsert
  sparse `room_type_inventory_dates` overrides (allotment, stop-sell,
  overbooking allowance, source) and clear them via ConfirmDialog. Uses existing
  `PUT`/`DELETE /api/admin/inventory/dates`. Hotel + room-type scoped; aggregated
  “All room types” view requires selecting a room type before edit. No schema
  change; public APIs untouched.
- **Files created:** `frontend/src/components/admin/InventoryDayEditPanel.js`.
- **Files modified:** `inventory/page.js`, `InventoryCalendarGrid.js`,
  `adminInventory.js`, docs/TODO/ADR.
- **APIs added:** none (consumes existing write APIs).
- **Database changes:** none.
- **Frontend changes:** day-edit panel, selectable calendar cells, clear confirm.
- **Backend changes:** none.
- **Remaining work:** booking internal-notes column; deployment / Phase 11+.

### Added — Admin inventory-date write APIs ✅

- **What changed.** Admin JWT upsert and delete/clear for sparse
  `room_type_inventory_dates` rows (business key `hotel_id` + `room_type_id` +
  `inventory_date`). Validates hotel existence, room-type ownership, date,
  allotment/overbooking bounds, source enum, and rejects unknown fields. No
  schema change; public availability/booking request bodies unchanged. Frontend
  day-edit UI not included.
- **Files created:** `backend/validators/adminInventory.validator.js`,
  `backend/scripts/verifyInventoryDateWrites.js`.
- **Files modified:** `inventory.service.js`, `inventory.controller.js`,
  `adminInventory.routes.js`, `backend/package.json`, docs/TODO/ADR.
- **APIs added:** `PUT /api/admin/inventory/dates`,
  `DELETE /api/admin/inventory/dates`.
- **Database changes:** none.
- **Frontend changes:** none.
- **Backend changes:** inventory write service methods + validation.
- **Remaining work:** `/admin/inventory` day-edit UI (done above); booking
  internal-notes column; deployment / Phase 11+.

### Added — Phase 10I — Persistent room-type inventory dates ✅

- **What changed.** Approved sparse table `room_type_inventory_dates` for per
  hotel / room type / night overrides (stop-sell, allotment, overbooking
  allowance). Availability engines (`booking.service`, `inventory.service`) use
  the formula `available = stop_sell ? 0 : max(0, COALESCE(allotment, physical)
  + overbooking_allowance - sold)`. Missing rows keep Phase 10D behaviour.
  Public availability request bodies unchanged; calendar/day responses now set
  `*_supported: true` and expose override fields. No channel-split / PMS / OTA
  inventory tables.
- **Files created:** `backend/migrations/005_room_type_inventory_dates.sql`,
  `backend/services/inventoryCapacity.js`,
  `backend/scripts/verifyPhase10I.js`.
- **Files modified:** `booking.service.js`, `inventory.service.js`,
  `booking.controller.js`, `inventory.controller.js`, `verifyPhase10D.js`,
  `backend/package.json`, docs/TODO/ADR.
- **APIs added:** none (existing inventory + booking availability routes).
- **APIs changed:** calendar/day payloads gain supported flags and optional
  allotment / sell_limit / stop_sell values; create/availability still reject
  stop-sell and oversold stays with `409`.
- **Database changes:** migration `005` — table `room_type_inventory_dates`
  (PK `id`; FKs `hotel_id`, `room_type_id` CASCADE; UNIQUE
  `(hotel_id, room_type_id, inventory_date)`; CHECKs; indexes; `set_updated_at`).
- **Frontend changes:** none required (admin calendar consumes updated fields).
- **Backend changes:** capacity helper + availability integration.
- **Remaining work:** admin inventory-date write APIs (done above) + day-edit
  UI; booking internal-notes column; deployment / Phase 11+.

### Changed — Room type overnight base_price operational setup ✅

- **What changed.** Verified `room_types.base_price` is `NUMERIC(12,2)`. Set
  overnight rates Deluxe **1999** / Suite **2999** for Zaarang Inn and Aurelia
  Grand. Left Standard at **0.00** so the ₹999 three-hour couple package is not
  treated as a per-night rate. Admin Room Type form clarifies base price is
  overnight; package card resolution skips overnight `base_price` for package
  rooms. Seed values aligned. No schema change; tariffs/meal plans/photos
  untouched.
- **Files created:** `backend/scripts/setRoomTypeBasePrices.js`,
  `backend/scripts/verifyRoomTypeBasePrices.js`.
- **Files modified:** `backend/scripts/seed.js`, `RoomTypeForm.js`,
  `tariffs.js` (`getRoomStartingPrice` package guard), docs/TODO.
- **APIs added:** none.
- **Database changes:** data only (`UPDATE room_types.base_price`); no schema.
- **Frontend changes:** admin helper text; package-safe starting price helper.
- **Backend changes:** ops scripts + seed defaults.
- **Remaining work:** Phase 10I inventory dates (done in Unreleased above);
  booking internal notes; deployment.

### Added — Phase 10H — Admin Inquiries CRUD UI ✅

- **What changed.** Admin inquiries module at `/admin/inquiries` (list + detail):
  search by name/email/phone, status/hotel filters, pagination, status update
  (+ optional `admin_notes`), delete with confirmation. Public `POST /api/inquiries`
  unchanged. List/get/status/delete now require admin JWT; list gains `q`,
  `hotel_id`, and `total` for pagination. No schema change.
- **Files created:** `frontend/src/lib/adminInquiries.js`,
  `frontend/src/app/admin/(protected)/inquiries/page.js`,
  `frontend/src/app/admin/(protected)/inquiries/[id]/page.js`.
- **Files modified:** `inquiry.controller.js`, `inquiry.routes.js`,
  `AdminGuard.js`, `StatusBadge.js`, dashboard, docs.
- **APIs added/changed:** `DELETE /api/inquiries/:id` (JWT); list/get/status
  require JWT; list supports `q` / `hotel_id` / `total`.
- **Database changes:** none.
- **Frontend changes:** inquiries list/detail UI + nav.
- **Backend changes:** inquiry admin auth + search/pagination/delete.
- **Remaining work:** stop-sell schema (approval); booking internal-notes
  column (schema); deployment guide; Phases 11–15.

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
  deployment / Phase 11+.

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
