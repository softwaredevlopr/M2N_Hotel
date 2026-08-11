# 06 — Setup Guide

> **Status:** Living document · **Last updated:** 2026-08-11  
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
- Optional seed admin: `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- Optional: `FRONTEND_URL` for CORS and booking email deep-links
- Optional email (Phase 10F): `EMAIL_ENABLED`, `EMAIL_PROVIDER` (`auto` /
  `console` / `smtp`), `EMAIL_FROM`, and `SMTP_*`. With no `SMTP_HOST`, messages
  are logged to the server console (no credentials required).

**Frontend** — optional `.env.local` (see `frontend/.env.example`):

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:5001` (preferred)
- Legacy alias: `NEXT_PUBLIC_API_URL`
- Optional: `NEXT_PUBLIC_SITE_URL` for canonical/SEO
- Optional: `NEXT_PUBLIC_DEFAULT_HOTEL_SLUG`

## 4. Database

```bash
cd backend
npm run migrate      # applies pending 001–006 (alphabetical via schema_migrations)
npm run seed         # hotels / rooms / media seed (optional)
npm run seed:admin   # create first admin
```

Non-local migrate checklist (005/006): [`12_DEPLOYMENT.md`](12_DEPLOYMENT.md) §6.
Do not run staging/production migrates from this setup guide alone.

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

## 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| DB connection refused | Start PostgreSQL; check `DATABASE_URL` / `DB_*` |
| Admin login fails | Run `seed:admin`; confirm `JWT_SECRET` |
| CORS errors | Ensure frontend origin is allowed; set `FRONTEND_URL` if needed |
| Upload 401 | Re-login; token required for `/api/admin/media/upload` |
