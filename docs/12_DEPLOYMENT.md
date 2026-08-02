# 12 — Deployment

> **Status:** Living document · **Last updated:** 2026-07-14  
> **Note:** Exact production hosts may still be finalized — fill URLs when known.

---

## 1. Overview

Deploy **frontend** (Next.js) and **backend** (Express + PostgreSQL) separately.
Admin uploads are stored on the backend filesystem (`uploads/`) unless/until
moved to object storage.

## 2. Environments

| Environment | Frontend | Backend | Notes |
|-------------|----------|---------|-------|
| Local | `http://localhost:3000` | `http://localhost:5001` | Dev |
| Staging | _TODO_ | _TODO_ | Optional |
| Production | _TODO_ (e.g. Vercel) | _TODO_ (e.g. Render) | Set CORS + env |

CORS allow-list includes `http://localhost:3000`, a Vercel preview host placeholder,
and `FRONTEND_URL` when set.

## 3. Build

```bash
cd frontend && npm run build
cd ../backend && npm install --omit=dev
```

## 4. Frontend deployment checklist

- Set `NEXT_PUBLIC_API_URL` to the public API origin.
- Set `NEXT_PUBLIC_SITE_URL` for canonical/SEO URLs.
- Confirm `npm run build` succeeds.

## 5. Backend deployment checklist

- Set `NODE_ENV=production` (enables `trust proxy`, hides stacks).
- Set `DATABASE_URL` (or `DB_*`), `JWT_SECRET`, `JWT_EXPIRES_IN`.
- Set `FRONTEND_URL` to the deployed frontend origin (CORS).
- Run migrations: `npm run migrate`.
- Persist `uploads/` volume if using local disk media.
- Health check: `GET /health`.

## 6. Database

- Apply migrations in order (`001`, `002`).
- Seed only when intentional (`npm run seed`, `npm run seed:admin`).

## 7. CI/CD

- TODO: Document pipeline once chosen (GitHub Actions, etc.).

## 8. Rollback

- TODO: Document image/tag rollback and DB migration rollback policy.
