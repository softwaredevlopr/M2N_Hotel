# 11 — Security

> **Status:** Living document · **Last updated:** 2026-09-03

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Secrets & Configuration](#2-secrets--configuration)
- [3. Authentication & Authorization](#3-authentication--authorization)
- [4. Data Protection](#4-data-protection)
- [5. API Security](#5-api-security)
- [6. Known security debt](#6-known-security-debt)
- [7. Dependencies](#7-dependencies)
- [8. Deployment security checklist](#8-deployment-security-checklist)

---

## 1. Overview

Security practices and known limitations for the current implementation
(through Phase 15 Lite).

## 2. Secrets & Configuration

- Secrets live in `.env` / host secret stores and must **never** be committed.
- Templates: `backend/.env.example`, `frontend/.env.example` (placeholders only).
- Email: `SMTP_PASS` is a secret; prefer `EMAIL_PROVIDER=console` unless real mail
  is required.
- Never paste production credentials into docs, tickets, or chat logs.

## 3. Authentication & Authorization

- **Admin JWT:** `POST /api/admin/auth/login` → Bearer token; passwords via
  **bcryptjs**; `requireAdminAuth` attaches `req.admin`.
- **Tenancy:** `resolveAdminTenancy` on protected admin routes (not login /
  public onboarding). `super_admin` = platform bypass. `hotel_admin` scoped by
  active `tenant_memberships`. Cross-tenant → **404**.
- **`membership_role`** (`owner`/`admin`/`staff`) is stored but **not** used for
  endpoint-level RBAC in Lite.
- Frontend stores token + profile in **`localStorage`** (`m2n_admin_*` keys) —
  XSS-sensitive; use HTTPS only.
- Login rate limit 20/15m; onboarding 10/15m; write/booking/lookup limits as in
  `server.js`.

## 4. Data Protection

- Guest booking lookup requires booking number + email/phone; identical 404 on
  miss to reduce enumeration.
- Public booking amounts computed server-side from `room_types.base_price`.
- `bookings.admin_notes` never exposed on public APIs.
- TODO: formal PII retention / encryption policy.

## 5. API Security

- Helmet (+ CORP `cross-origin`), CORS allow-list (`localhost:3000`,
  `https://m2n-hotel.vercel.app`, `FRONTEND_URL` exact origin), body 100kb,
  rate limits, validate middleware, production error middleware hides stacks.

## 6. Known security debt

| Item | Risk | Mitigation today |
|------|------|------------------|
| JWT in `localStorage` | XSS token theft | HTTPS; avoid third-party scripts on admin |
| Public onboarding | Account creation abuse | Rate limit 10/15m; monitor |
| Local `uploads/` | Data loss / cross-instance miss | Persistent volume or object storage later |
| No payment gateway secrets | N/A | None configured — ledger only |
| Tenant `suspended` soft | Limited product gate | Cancelled tenants excluded from membership load |

## 7. Dependencies

Keep Node dependencies updated; review advisories on major upgrades.

## 8. Deployment security checklist

See [12 — Deployment](12_DEPLOYMENT.md) §7. Staging before production. Confirm
DB target before migrate/seed. Never fake `schema_migrations` rows.
