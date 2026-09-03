# 02 — Architecture

> **Status:** Living document · **Last updated:** 2026-09-03  
> **Related:** [04 — API](04_API.md) · [03 — Database](03_DATABASE.md) · [01 — Status](01_PROJECT_STATUS.md)

---

## 1. Overview

Two-tier application: **Next.js** frontend and **Express** API on **PostgreSQL**.
Public marketing + guest booking UI; JWT admin console. Data-driven and
**slug-scoped** hotels; Phase 15 Lite adds **tenant** isolation for operators.

## 2. Tech stack

| Layer | Technology | Port |
|-------|------------|------|
| Frontend | Next.js **16.2.6** (React **19.2.4**, App Router, Tailwind **4**) | `3000` |
| Backend | Node.js ≥ 18 + Express (CommonJS) | `5001` |
| Database | PostgreSQL (`pg` pool) | `5432` |
| Auth (admin) | JWT (`jsonwebtoken`) + bcryptjs | — |
| Uploads | Multer → `backend/uploads` served at `/uploads` | — |

Frontend API base: `NEXT_PUBLIC_API_BASE_URL` (preferred) or legacy
`NEXT_PUBLIC_API_URL` (fallback `http://localhost:5001`). Build-time inlined.

## 3. High-level diagram

```
┌─────────────┐     HTTPS/JSON      ┌──────────────────┐
│   Browser   │ ◄─────────────────► │ Next.js (:3000)  │
│  (guest /   │                     │  Public + /admin │
│   admin)    │                     └────────┬─────────┘
└─────────────┘                              │ NEXT_PUBLIC_API_BASE_URL
                                             ▼
                                    ┌──────────────────┐
                                    │ Express (:5001)  │
                                    │ /api/* /health   │
                                    │ /uploads/*       │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │ PostgreSQL       │
                                    │ tenants→hotels   │
                                    └──────────────────┘
```

### Public vs admin

```
Public (no JWT)                         Admin (Bearer JWT + tenancy)
─────────────────                       ────────────────────────────
GET  /api/hotels|rooms|tariffs          /api/admin/auth/*
POST /api/inquiries                     /api/admin/hotels|room-types|rooms|media
POST/GET booking APIs (contact checks)  /api/admin/bookings (+ payments/invoices)
POST /api/admin/onboarding (public)     /api/admin/inventory|guests|inquiries
GET  /health, /                         GET  /api/admin/tenant (billing stub)
frontend/public/Photos                  backend/uploads (ephemeral on cloud)
```

## 4. Frontend

- App Router under `frontend/src/app/`
- Admin JWT in **`localStorage`** (`m2n_admin_access_token`, `m2n_admin_profile`)
- Guest booking contact memory in **sessionStorage** (tab-scoped)
- Admin shell: `AdminGuard.js`

## 5. Backend

- Entry: `server.js` — Helmet, CORS allow-list, rate limits, body 100kb, `/uploads`
- Layers: routes → controllers → services / `config/db.js`
- Errors: `notFoundHandler` + `errorHandler` (no stacks in production)
- Tenancy: `resolveAdminTenancy` → `req.tenancy`; `super_admin` platform bypass;
  cross-tenant → **404**. `membership_role` stored but not RBAC-gated in Lite.

## 6. Key design decisions

- Slug-scoped hotels; never mix Photos folders.
- Booking availability from rooms + bookings (+ inventory date overrides).
- CRM Lite without a `guests` table.
- Phase 14 = manual ledger, **not** a payment gateway.
- Phase 15 Lite = tenants + memberships + hotel `tenant_id`; no per-hotel ACL.
- Seed reuses `m2n-hotels` after `009` ([ADR-0043](history/DECISIONS.md)).

## 7. Known limitations

- Admin JWT XSS surface (`localStorage`)
- Local upload disk not multi-instance safe
- No live payment gateway / SaaS subscription billing
- No guest user accounts (`/login` stub)
- Tenant `suspended` / `past_due` not hard-gated beyond cancelled membership filter

## 8. Open / deferred

Full CRM, ERP, HRMS, OTA/channel manager, AI automation, travel ecosystem —
roadmap vision only ([13 — Roadmap](13_ROADMAP.md)).
