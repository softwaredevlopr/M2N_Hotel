# 01 — Project Status

> **Status:** Living document · **Last updated:** 2026-09-06  
> **Related:** [`../PROJECT_DOCS.md`](../PROJECT_DOCS.md) · [13 — Roadmap](13_ROADMAP.md)  
> **Evidence basis:** application code, migrations `001`–`009`, `package.json`
> scripts, frontend App Router pages, git `main` through `39424e9`, plus
> operator-verified staging seed and admin login/tenant smoke.

---

## Table of Contents

- [1. Snapshot](#1-snapshot)
- [2. Status matrix](#2-status-matrix)
- [3. Staging / deployment facts](#3-staging--deployment-facts)
- [4. Completed product work](#4-completed-product-work)
- [5. Partial / deferred](#5-partial--deferred)
- [6. Pending / next up](#6-pending--next-up)
- [7. Known issues](#7-known-issues)
- [8. Status log](#8-status-log)

---

## 1. Snapshot

| Area | Status |
|------|--------|
| Public multi-hotel website | **COMPLETE** |
| Express API + PostgreSQL (`001`–`009`) | **COMPLETE** |
| Admin JWT console (CRUD + ops) | **COMPLETE** |
| Booking engine (public + admin) | **COMPLETE** (no live gateway) |
| Inventory calendar + date overrides | **COMPLETE** |
| CRM Lite (derived guests) | **COMPLETE** (no guests table) |
| Payments / invoices (manual ledger) | **COMPLETE** (no Stripe/Razorpay) |
| Phase 15 Lite tenancy + onboarding + billing stub | **COMPLETE** |
| Seed scripts post-`009` compatible | **COMPLETE** (`be2351a`) |
| Staging Postgres migrate `001`–`009` | **COMPLETE** (verified) |
| Staging backend deploy + `/health` | **COMPLETE** (verified) |
| Staging hotel seed + `seed:admin` | **COMPLETE** (verified: `GET /api/hotels` count=2; super_admin + `owner` on `m2n-hotels`) |
| Staging admin login + tenant smoke | **COMPLETE** (`POST /api/admin/auth/login` → `role=super_admin`, `token_type=Bearer`; `GET /api/admin/tenant` → `slug=m2n-hotels`, `plan=lite`, `subscription_status=active`) |
| Staging frontend deploy | **NOT STARTED** |
| Production deployment | **NOT STARTED** |
| Live SaaS payment gateway | **DEFERRED** |
| Full CRM / ERP / HRMS / OTA / AI | **NOT STARTED** (roadmap vision) |

**Exact next operational task:** **STAGING FRONTEND SETUP / DEPLOYMENT** —
configure staging frontend env (API base URL + CORS/`FRONTEND_URL`), build, and
deploy when approved. See [12 — Deployment](12_DEPLOYMENT.md). Do not treat
staging frontend or production as complete until verified.

---

## 2. Status matrix

Legend: **COMPLETE** · **PARTIAL** · **DEFERRED** · **NOT STARTED**

| Capability | Status | Notes |
|------------|--------|-------|
| Core backend (Express, pool, `/`, `/health`, errors, validate) | COMPLETE | `server.js`, `config/db.js` |
| DB migrations `001`–`009` | COMPLETE | Runner + `schema_migrations` |
| Public hotel / room / tariff APIs | COMPLETE | |
| Inquiries public + admin CRUD | COMPLETE | |
| Admin auth (JWT, bcrypt, roles) | COMPLETE | Token in browser `localStorage` |
| Hotel / room-type / room / media admin | COMPLETE | Uploads → `backend/uploads` |
| Tariff admin + public matrix | COMPLETE | Package copy still partly in `lib/tariffs.js` |
| Bookings public + admin + front desk | COMPLETE | |
| Inventory dates + admin UI | COMPLETE | |
| CRM Lite guests search / 360 | COMPLETE | Derived; no `guests` table |
| Internal payments / invoices | COMPLETE | Manual ledger only |
| External payment gateway | DEFERRED | No Stripe/Razorpay/checkout |
| Media filesystem photos + admin upload | COMPLETE | Ephemeral disk risk on cloud |
| Phase 15 tenancy tables + AuthZ | COMPLETE | `membership_role` stored, not RBAC-gated |
| Self-serve onboarding | COMPLETE | API + `/admin/onboarding` |
| Operator billing stub | COMPLETE | Read-only; no plan mutation |
| Seed `npm run seed` / `seed:admin` | COMPLETE | Post-`009`; needs `m2n-hotels` |
| Guest account login (`/login`) | PARTIAL | Stub UI only |
| Reviews | PARTIAL | Empty-state UI; no reviews API |
| SMS / WhatsApp delivery | PARTIAL | Prefs stored; send not implemented |
| Tenant suspend hard lockout | PARTIAL | `cancelled` filtered; `suspended` soft |
| Per-hotel ACL within tenant | DEFERRED | Lite: all hotels under tenant |
| Tenant picker UI | DEFERRED | Multi-membership needs `tenant_id` query |
| Staging DB + migrate | COMPLETE | Through `009` |
| Staging backend | COMPLETE | Healthy + DB connected |
| Staging seed + `seed:admin` | COMPLETE | Hotels count=2; super_admin + owner membership |
| Staging admin login + tenant smoke | COMPLETE | Login + `GET /api/admin/tenant` verified |
| Staging frontend | NOT STARTED | Setup/deploy not started |
| Production | NOT STARTED | |
| Multi-property SaaS beyond Lite | PARTIAL | Foundation only |
| PMS maturity beyond Lite board | DEFERRED | |
| Full CRM / ERP / HRMS / OTA / AI / travel ecosystem | NOT STARTED | Vision only |

---

## 3. Staging / deployment facts

Recorded facts (placeholders only for secrets; API host is public staging URL):

| Fact | State |
|------|-------|
| Staging PostgreSQL DB name | `m2n_hotel_staging` (migrations `001`–`009` applied) |
| Migration re-run | Idempotent (skips recorded files) |
| Staging backend | Deployed; `/` and `/health` healthy; DB connected |
| Staging API origin | `https://m2n-hotel-staging-api.onrender.com` |
| `GET /api/hotels` on staging | **count=2** (seeded; verified) |
| Default tenant `m2n-hotels` | Present (verified) |
| Staging admin role | `super_admin` (verified) |
| Tenant membership | `owner` + active (verified) |
| Seed scripts | Post-`009` compatible on `main` (`be2351a`) |
| Staging seed + `seed:admin` | **COMPLETE** (verified) |
| Operator Node seed vs Render SSL | Requires `DB_SSL=true` and/or `sslmode=require` (and/or `NODE_ENV=production`) in the seed session — see [12 — Deployment](12_DEPLOYMENT.md) §6.2.2 |
| Staging admin login smoke | **COMPLETE** (`token_type=Bearer`; do not paste tokens) |
| Staging `GET /api/admin/tenant` | **COMPLETE** (`slug=m2n-hotels`, `plan=lite`, `subscription_status=active`) |
| Staging frontend | **NOT STARTED** |
| Production | **NOT STARTED** — must not be modified yet |

---

## 4. Completed product work

### Phases 1–9
Public multi-hotel site, inquiries, JWT admin, hotels/room-types/rooms/media CRUD,
API-driven hotel pages, tariff rates.

### Phases 10–12
Booking engine (schema + public UI + admin console), inventory engine + calendar UI,
emails (console/SMTP), admin create booking, inquiries CRUD, inventory dates,
cancel/stay modify/prefs, Front Desk board + room status board.

### Phase 13 CRM Lite
Derived guest search + Guest 360 + open leads over `bookings`/`inquiries`. No
`guests` table.

### Phase 14 Lite
Migration `008` + admin payment/invoice APIs + booking-detail finance UI. **No**
payment gateway.

### Phase 15 Lite
- Migration `009` + AuthZ (`resolveAdminTenancy`)
- `POST /api/admin/onboarding` + `/admin/onboarding`
- `GET /api/admin/tenant` + `/admin/billing` (read-only)
- Seed tenancy compatibility (`be2351a`, ADR-0043)

### Frontend routes (evidence)
Public: `/`, `/about`, `/login` (stub), `/hotels/[slug]`, `/book`, `/booking`,
`/booking/[bookingNumber]`.  
Admin: login, onboarding, dashboard, front-desk, bookings (+ new/detail), guests,
inventory, hotels/room-types/rooms/media/tariffs CRUD, inquiries, billing.

Stack: Next.js **16.2.6**, React **19.2.4**, Tailwind **^4**.

---

## 5. Partial / deferred

| Item | Classification |
|------|----------------|
| External SaaS / booking payment gateway | DEFERRED |
| Full CRM guest master / merge / dated follow-ups | DEFERRED (needs approval) |
| Guest `/login` accounts | PARTIAL (stub) |
| Reviews API | PARTIAL (UI empty state) |
| SMS/WhatsApp send | PARTIAL (prefs only) |
| `membership_role` permission differentiation | PARTIAL (data only) |
| Production object storage for uploads | DEFERRED (tech debt) |
| ERP / HRMS / OTA / AI automation | NOT STARTED |

---

## 6. Pending / next up

1. **STAGING FRONTEND SETUP / DEPLOYMENT** — configure staging web env, build,
   deploy when approved (not started).
2. Replace placeholder contact details before public launch.
3. Production cutover only after staging validation (not started).
4. Live payment gateway / Full CRM only with separate approval.
5. Optional: harden `db.js` SSL defaults for remote `DATABASE_URL` without
   requiring session `DB_SSL` (code change needs approval).

---

## 7. Known issues

| ID | Issue | Severity | Notes |
|----|-------|----------|-------|
| MED-SEED | Aurelia `hotel_media` flat paths vs `Photos/Aurelia-Grand/**` | Low | Filesystem fallback |
| ROOM-HOTEL | `bookings.room_id` vs `hotel_id` app-enforced | Low | Composite FK needs approval |
| CONTACT | Placeholder phones/emails in seed/UI | Medium | Replace before launch |
| UPLOADS | `backend/uploads` local disk | Medium | Ephemeral on multi-instance hosts |
| JWT-XSS | Admin JWT in `localStorage` | Known | HTTPS; future httpOnly cookies not implemented |
| PG-SSL | Node `pg` disables SSL unless `DB_SSL` / `NODE_ENV=production` / URL `sslmode=require` | Medium | `psql` may still connect; operator seed sessions must set SSL explicitly ([ADR-0044](history/DECISIONS.md)) |

---

## 8. Status log

| Date | Update |
|------|--------|
| 2026-09-06 | Staging admin login + tenant smoke COMPLETE; next = staging frontend |
| 2026-09-04 | Staging seed + seed:admin verified (hotels=2); next = login smoke |
| 2026-09-03 | Full docs reconciliation; next task = staging seed |
| 2026-09-03 | Seed post-`009` compatibility (`be2351a`) + docs sync (`c7bbbad`) |
| 2026-08-29 | Phase 15 billing stub + onboarding UI |
| 2026-08-26 | Phase 15 onboarding API |
| 2026-08-22 | Phase 15 Lite tenant isolation |
| 2026-08-20 | Phase 14 booking-detail finance UI |
| 2026-08-19 | Phase 14 admin finance APIs |
| 2026-08-18 | Phase 14 schema `008` |
