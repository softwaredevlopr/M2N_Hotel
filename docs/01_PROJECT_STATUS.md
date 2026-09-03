# 01 — Project Status

> **Status:** Living document · **Last updated:** 2026-09-03  
> **Related:** [`../PROJECT_DOCS.md`](../PROJECT_DOCS.md) · [13 — Roadmap](13_ROADMAP.md)  
> **Evidence basis:** application code, migrations `001`–`009`, `package.json`
> scripts, frontend App Router pages, git `main` through `c7bbbad`.

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
| Staging Postgres migrate `001`–`009` | **COMPLETE** (operator-reported) |
| Staging backend deploy + `/health` | **COMPLETE** (operator-reported) |
| Staging hotel seed | **NOT STARTED** (`GET /api/hotels` empty until seed) |
| Staging frontend deploy | **NOT STARTED** / **UNKNOWN** (no repo evidence of completed staging web cutover) |
| Production deployment | **NOT STARTED** |
| Live SaaS payment gateway | **DEFERRED** |
| Full CRM / ERP / HRMS / OTA / AI | **NOT STARTED** (roadmap vision) |

**Exact next operational task:** **STAGING DATA INITIALIZATION / VALIDATION** —
confirm staging DB target → `npm run seed` → `npm run seed:admin` → verify
`GET /api/hotels` ([12 — Deployment](12_DEPLOYMENT.md) §6.2).

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
| Staging seed | NOT STARTED | Hotels count 0 until seed |
| Staging frontend | NOT STARTED | No completed cutover in repo |
| Production | NOT STARTED | |
| Multi-property SaaS beyond Lite | PARTIAL | Foundation only |
| PMS maturity beyond Lite board | DEFERRED | |
| Full CRM / ERP / HRMS / OTA / AI / travel ecosystem | NOT STARTED | Vision only |

---

## 3. Staging / deployment facts

Recorded facts (do not invent hosts/URLs):

| Fact | State |
|------|-------|
| Staging PostgreSQL | Exists; migrations `001`–`009` applied |
| Migration re-run | Idempotent (skips recorded files) |
| Staging backend | Deployed; `/` and `/health` healthy; DB connected |
| `GET /api/hotels` on staging | Empty until seed (count 0) |
| Seed scripts | Post-`009` compatible on `main` (`be2351a`) |
| Staging seed executed | **No** (unless operator proves otherwise later) |
| Staging frontend | Not documented as complete in repo |
| Production | Must not be modified yet |

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

1. **Staging seed** — confirm target → `npm run seed` → `seed:admin` → verify hotels.
2. Staging frontend configure/build/deploy (when approved).
3. Replace placeholder contact details before public launch.
4. Production cutover only after staging validation.
5. Live payment gateway / Full CRM only with separate approval.

---

## 7. Known issues

| ID | Issue | Severity | Notes |
|----|-------|----------|-------|
| MED-SEED | Aurelia `hotel_media` flat paths vs `Photos/Aurelia-Grand/**` | Low | Filesystem fallback |
| ROOM-HOTEL | `bookings.room_id` vs `hotel_id` app-enforced | Low | Composite FK needs approval |
| CONTACT | Placeholder phones/emails in seed/UI | Medium | Replace before launch |
| UPLOADS | `backend/uploads` local disk | Medium | Ephemeral on multi-instance hosts |
| JWT-XSS | Admin JWT in `localStorage` | Known | HTTPS; future httpOnly cookies not implemented |

---

## 8. Status log

| Date | Update |
|------|--------|
| 2026-09-03 | Full docs reconciliation; next task = staging seed |
| 2026-09-03 | Seed post-`009` compatibility (`be2351a`) + docs sync (`c7bbbad`) |
| 2026-08-29 | Phase 15 billing stub + onboarding UI |
| 2026-08-26 | Phase 15 onboarding API |
| 2026-08-22 | Phase 15 Lite tenant isolation |
| 2026-08-20 | Phase 14 booking-detail finance UI |
| 2026-08-19 | Phase 14 admin finance APIs |
| 2026-08-18 | Phase 14 schema `008` |
