# 06 — Setup Guide

> **Status:** Living document · **Last updated:** 2026-09-04  
> **Related:** [`../README.md`](../README.md) · [`../PROJECT_DOCS.md`](../PROJECT_DOCS.md) ·
> [`12_DEPLOYMENT.md`](12_DEPLOYMENT.md)

---

## 1. Prerequisites

- Node.js **≥ 18**
- PostgreSQL
- npm

## 2. Install

```bash
cd backend && npm install
cd ../frontend && npm install
```

## 3. Environment

**Backend** — copy `backend/.env.example` → `backend/.env`:

- Database: `DATABASE_URL` **or** `DB_*` fields
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `NODE_ENV` — set `production` on staging/production API hosts
- Optional seed admin: `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- Optional: `FRONTEND_URL` for CORS and booking email deep-links
- Optional DB SSL/pool: `DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`, `DB_POOL_MAX`, etc.
  For **operator migrate/seed against managed Postgres** from a local shell, set
  session `$env:DB_SSL="true"` and/or include `sslmode=require` in `DATABASE_URL`
  (see [12 — Deployment](12_DEPLOYMENT.md) §6.2.2 / [ADR-0044](history/DECISIONS.md)).
  Render API hosts with `NODE_ENV=production` already enable SSL.
- Optional email (Phase 10F): `EMAIL_ENABLED`, `EMAIL_PROVIDER` (`auto` /
  `console` / `smtp`), `EMAIL_FROM`, and `SMTP_*`. With no `SMTP_HOST`, messages
  are logged to the server console (no credentials required).
- Verify scripts only: `TEST_BASE_URL` (defaults to `http://localhost:5001`)

**Frontend** — optional `.env.local` (see `frontend/.env.example`):

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:5001` (preferred)
- Legacy alias: `NEXT_PUBLIC_API_URL`
- Optional: `NEXT_PUBLIC_SITE_URL` for canonical/SEO
- Optional: `NEXT_PUBLIC_DEFAULT_HOTEL_SLUG`

## 4. Database

```bash
cd backend
npm run migrate      # applies pending 001–009 (alphabetical via schema_migrations)
npm run seed         # hotels / rooms / media (post-009 compatible; needs m2n-hotels)
npm run seed:admin   # first super_admin + owner membership on m2n-hotels
```

Order: **migrate through `009` first**, then seed. Seed scripts (commit
`be2351a`) attach hotels to the existing default tenant `m2n-hotels` and do not
create tenants. If `m2n-hotels` is missing, seed fails fast — re-run migrate.
Rerunning seed does not move an existing hotel’s `tenant_id`. See
[`03_DATABASE.md`](03_DATABASE.md) §6.

Non-local migrate / staging cutover (through `009`, then seed):
[`12_DEPLOYMENT.md`](12_DEPLOYMENT.md) §6. Do not run staging/production migrates
or seeds from this setup guide alone. Confirm DB target before writes.

## 5. Run

```bash
# Terminal 1
cd backend && npm run dev    # :5001

# Terminal 2
cd frontend && npm run dev   # :3000
```

## 6. Verify

| Check | URL |
|-------|-----|
| API health | `http://localhost:5001/health` |
| Public site | `http://localhost:3000` |
| Admin login | `http://localhost:3000/admin/login` |
| Onboarding (public) | `http://localhost:3000/admin/onboarding` |
| Billing stub (JWT) | `http://localhost:3000/admin/billing` |

Phase 15 smoke (API must be running):

```bash
cd backend
npm run verify:phase15
npm run verify:phase15-onboarding
npm run verify:phase15-billing
```

## 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| DB connection refused | Start PostgreSQL; check `DATABASE_URL` / `DB_*` |
| Seed/migrate: `SSL/TLS required` | Set session `DB_SSL=true` and/or URL `sslmode=require` (managed providers); `psql` success does not imply Node SSL is on |
| Admin login fails | Run `seed:admin`; confirm `JWT_SECRET`; ensure `m2n-hotels` tenant exists (migrate through `009`) |
| Seed fails: default tenant missing | Run `npm run migrate` through `009`; seed does not create tenants |
| CORS errors | Ensure frontend origin is allowed; set `FRONTEND_URL` if needed |
| Upload 401 | Re-login; token required for `/api/admin/media/upload` |
