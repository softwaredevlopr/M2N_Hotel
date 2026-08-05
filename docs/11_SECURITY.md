# 11 — Security

> **Status:** Living document · **Last updated:** 2026-07-14

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Secrets & Configuration](#2-secrets--configuration)
- [3. Authentication & Authorization](#3-authentication--authorization)
- [4. Data Protection](#4-data-protection)
- [5. API Security](#5-api-security)
- [6. Dependencies](#6-dependencies)
- [7. TODO](#7-todo)

---

## 1. Overview

This document tracks security practices and requirements.

## 2. Secrets & Configuration

- Secrets live in `.env` files and must **never** be committed.
- Use `backend/.env.example` as a template.
- Email (Phase 10F): `SMTP_PASS` / provider API keys are secrets. Prefer
  `EMAIL_PROVIDER=console` (or leave `SMTP_HOST` empty) in local development so
  no credentials are required. Guest PII in email bodies must not be logged
  beyond operational need; the console provider logs subject + a short text
  preview only.

## 3. Authentication & Authorization

- **Admin (Roadmap Phase 3 — JWT):**
  - `POST /api/admin/auth/login` issues a Bearer access token (`jsonwebtoken`).
  - Passwords hashed with **bcryptjs** (`password_hash` only; never returned).
  - `requireAdminAuth` middleware verifies Bearer JWT and attaches `req.admin`.
  - Roles: `super_admin`, `hotel_admin` (hotel-scoped assignments come later).
  - Generic invalid-login message; inactive accounts rejected with 403.
  - Login rate-limited (20 / 15 min) in addition to the general `/api` limiter.
- Env: `JWT_SECRET` (required), `JWT_EXPIRES_IN` (default `8h`), plus
  `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` for `npm run seed:admin` only.
- Protected modules: `/api/admin/hotels`, `/room-types`, `/rooms`, `/media`.

## 4. Data Protection

- TODO: Define handling of guest/inquiry data (PII), retention, and encryption.

## 5. API Security

Implemented (see `backend/server.js` and `backend/middleware/`):

- **Helmet** — secure HTTP response headers (with `crossOriginResourcePolicy`
  set to `cross-origin` so the frontend can consume JSON).
- **CORS** — origin allow-list (`localhost:3000`, the Vercel URL, and
  `FRONTEND_URL`); explicit methods/headers; `credentials: true`.
- **Rate limiting** — general limiter on `/api` (300 requests / 15 min), a
  stricter limiter on `POST /api/inquiries` and `POST /api/bookings`
  (20 / 15 min, `WRITE_RATE_LIMIT_MAX`), a lookup limiter on
  `GET /api/bookings/:bookingNumber` (60 / 15 min,
  `BOOKING_LOOKUP_RATE_LIMIT_MAX`), and a stricter limiter on
  `POST /api/admin/auth/login` (20 / 15 min).
- **Request-size limits** — JSON and urlencoded bodies capped at 100kb.
- **Input validation** — `validate` middleware + controller-level checks.
- **Guest booking lookup** — requires the booking number *plus* the email or
  phone on the reservation. An unknown reference and a failed contact check
  return an identical `404`, so references cannot be enumerated, and the
  response omits guest contact details and internal identifiers.
- **Untrusted pricing** — public booking amounts are computed server-side from
  `room_types.base_price`; client-supplied totals and statuses are ignored.
- **Error disclosure** — `error.middleware.js` returns generic messages for 500s
  and never sends stack traces; set `NODE_ENV=production` in prod.

**Guest booking UI (Phase 10B)**

- `/booking/[bookingNumber]` is `noindex, nofollow` and `/booking/` is disallowed
  in `robots.txt`, so reservation pages never reach a search index.
- The lookup contact is kept in **sessionStorage** (tab-scoped, cleared when the
  tab closes) purely so the confirmation page can call the verified lookup
  without re-prompting. It is never placed in the URL, where it would leak
  through history, referrers and server logs.
- Client-side validation is a convenience layer only; every limit is still
  enforced by the API, and the UI never sends prices, statuses or booking sources.

TODO: Consider adding request logging, CSRF strategy (if cookies/auth are added),
and stricter helmet CSP once the asset origins are finalized.

## 6. Dependencies

- TODO: Dependency audit / update policy.

## 7. TODO

- [ ] Threat model.
- [ ] Security review checklist.
