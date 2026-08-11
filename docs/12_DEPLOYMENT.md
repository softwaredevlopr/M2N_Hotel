# 12 — Deployment

> **Status:** Living document · **Last updated:** 2026-08-11  
> **Scope:** Deployment architecture and readiness for the **current** M2N Hotels
> stack (Phases 1–10I + `bookings.admin_notes`).  
> **Hard rule:** This guide does **not** authorize running migrations or deploys
> against staging/production until an operator explicitly executes those steps.

Related:

- Local setup: [`06_SETUP_GUIDE.md`](06_SETUP_GUIDE.md)
- Security: [`11_SECURITY.md`](11_SECURITY.md)
- Migrations: [`../backend/migrations/README.md`](../backend/migrations/README.md)
- Env templates: `backend/.env.example`, `frontend/.env.example`

---

## Table of Contents

1. [Deployment architecture](#1-deployment-architecture)
2. [Environment variables](#2-environment-variables)
3. [Backend deployment](#3-backend-deployment)
4. [Frontend deployment](#4-frontend-deployment)
5. [PostgreSQL deployment](#5-postgresql-deployment)
6. [Migration 005 / 006 safe rollout](#6-migration-005--006-safe-rollout)
7. [Security checklist](#7-security-checklist)
8. [Pre-production checklist](#8-pre-production-checklist)
9. [Rollback / recovery](#9-rollback--recovery)
10. [Future CI/CD (recommended only)](#10-future-cicd-recommended-only)
11. [Remaining blockers](#11-remaining-blockers)

---

## 1. Deployment architecture

M2N Hotels is a **multi-property** platform today (slug-scoped hotels) and should
stay deployable as separate services so future SaaS tenancy can add property
isolation without rewriting hosts.

```text
                    ┌─────────────────────────┐
   Visitors ───────▶│  Frontend (Next.js)     │
   / Admin UI       │  HTTPS public origin    │
                    │  NEXT_PUBLIC_API_* ─────┼──┐
                    └─────────────────────────┘  │
                                                 ▼
                    ┌─────────────────────────┐
                    │  Backend (Express)      │
                    │  HTTPS API origin       │
                    │  /health · /api/*       │
                    │  /uploads (media files) │
                    └───────────┬─────────────┘
                                │ TLS preferred
                                ▼
                    ┌─────────────────────────┐
                    │  PostgreSQL             │
                    │  private network only   │
                    └─────────────────────────┘
```

| Component | Technology | Local default | Production recommendation |
|-----------|------------|---------------|---------------------------|
| Frontend | Next.js App Router | `:3000` (`npm run dev` / `next start`) | Separate HTTPS origin (e.g. Vercel or Node host) |
| Backend | Node.js ≥ 18 + Express | `:5001` (`npm run start`) | Separate HTTPS origin behind reverse proxy |
| Database | PostgreSQL | `:5432` | Managed Postgres; not publicly writable |
| Media | Backend `uploads/` | local disk | Persist volume **or** future object storage (CDN) |

### Domain / DNS / HTTPS

1. Point the **marketing / admin** hostname (e.g. `https://www.example.com`) at
   the frontend.
2. Point the **API** hostname (e.g. `https://api.example.com`) at the backend.
3. Terminate **TLS** at the edge (CDN / load balancer / platform). Set
   `NODE_ENV=production` on the API so Express enables `trust proxy`.
4. Set backend `FRONTEND_URL` to the exact frontend origin used in browsers
   (CORS allow-list). Optionally keep the static preview origin already coded in
   `server.js` only if still needed.
5. Set frontend `NEXT_PUBLIC_API_BASE_URL` (preferred) or `NEXT_PUBLIC_API_URL`
   to the public API origin **at build time** (Next.js inlines `NEXT_PUBLIC_*`).

### Separation rationale (SaaS-ready)

- Keep **DB private**; never expose Postgres to the public internet.
- Keep **API** and **web** on separate origins so CORS and JWT Bearer auth stay
  explicit; future `hotel_admin` scoping can remain API-side.
- Persist or migrate off local `uploads/` before multi-instance backends (sticky
  disk or object storage). Multi-property media remains **hotel-scoped** in data
  and folder mapping — do not mix hotel photos.

---

## 2. Environment variables

**Never commit real secrets.** Use placeholders below. Templates live in
`backend/.env.example` and `frontend/.env.example`.

### 2.1 Backend

| Variable | Required | Purpose |
|----------|----------|---------|
| `NODE_ENV` | Prod: yes | `production` enables `trust proxy` and hides error stacks |
| `PORT` | no | HTTP listen port (default `5001`) |
| `DATABASE_URL` | one of | Full Postgres URL (preferred on hosted DBs) |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | one of | Used when `DATABASE_URL` is empty |
| `DB_SSL` | staging/prod | Prefer `true` for remote Postgres |
| `DB_SSL_REJECT_UNAUTHORIZED` | optional | Default reject unauthorized; set carefully only if provider requires |
| `DB_POOL_MAX` / `DB_IDLE_TIMEOUT_MS` / `DB_CONNECTION_TIMEOUT_MS` | optional | Pool tuning |
| `JWT_SECRET` | **yes** | Long random secret for admin JWTs |
| `JWT_EXPIRES_IN` | no | Default `8h` |
| `FRONTEND_URL` | staging/prod | Frontend origin added to CORS + email deep-links |
| `PUBLIC_SITE_URL` | optional | Fallback site URL for email links if `FRONTEND_URL` unset |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed only | Used by `npm run seed:admin` — **not** runtime login config |
| `EMAIL_ENABLED` | optional | Default on; set `false` to disable outbound mail |
| `EMAIL_PROVIDER` | optional | `auto` \| `console` \| `smtp` |
| `EMAIL_FROM` / `EMAIL_REPLY_TO` / `EMAIL_BRAND_NAME` | optional | From-header / branding |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | SMTP only | Placeholders only in examples; store real values in the host secret store |
| `WRITE_RATE_LIMIT_MAX` | optional | POST inquiry/booking limit (default `20` / 15 min) |
| `BOOKING_LOOKUP_RATE_LIMIT_MAX` | optional | Guest booking GET lookup limit (default `60` / 15 min) |
| `TEST_BASE_URL` | verify scripts only | Override API base for smoke scripts (default `http://localhost:5001`) |

### 2.2 Frontend

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | staging/prod | Preferred public API origin (build-time) |
| `NEXT_PUBLIC_API_URL` | legacy alias | Used if `NEXT_PUBLIC_API_BASE_URL` unset |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical / SEO base URL |
| `NEXT_PUBLIC_DEFAULT_HOTEL_SLUG` | optional | Fallback hotel slug only when none selected |

### 2.3 Environment matrix (placeholders)

| Variable | Local development | Staging | Production |
|----------|-------------------|---------|------------|
| `NODE_ENV` | unset / `development` | `production` | `production` |
| `PORT` | `5001` | platform-assigned or `5001` | platform-assigned |
| DB | `DB_*` → local Postgres **or** empty `DATABASE_URL` | `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME_STAGING?sslmode=require` | same pattern, prod DB name |
| `DB_SSL` | `false` | `true` | `true` |
| `JWT_SECRET` | long local secret | unique staging secret | unique production secret |
| `FRONTEND_URL` | `http://localhost:3000` | `https://staging.example.com` | `https://www.example.com` |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5001` | `https://api-staging.example.com` | `https://api.example.com` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | staging site URL | production site URL |
| Email | `EMAIL_PROVIDER=console` | console or test SMTP | real SMTP / future provider |
| Seed admin vars | local `.env` only | set once in secret store for first seed | set once; rotate password after |

Replace `USER`, `PASSWORD`, `HOST`, `DBNAME_*`, and hostnames with environment-specific
values in the host’s secret manager — never paste real credentials into git.

---

## 3. Backend deployment

Commands are from `backend/package.json`.

### 3.1 Install

```bash
cd backend
npm install --omit=dev
```

(Use full `npm install` if you need `nodemon` / verify scripts on the host.)

### 3.2 Configure environment

1. Copy `backend/.env.example` → platform secrets / `.env` (never commit `.env`).
2. Set `NODE_ENV=production`, DB connection, `JWT_SECRET`, `FRONTEND_URL`.
3. Confirm SMTP only if real mail is required; otherwise leave `SMTP_HOST` empty
   (`EMAIL_PROVIDER=console` / auto → console).

### 3.3 Migrate

```bash
cd backend
npm run migrate
```

Runner: `scripts/runMigrations.js` — applies pending `migrations/*.sql` in
alphabetical order and records filenames in `schema_migrations`.  
**Do not** edit already-applied migration files; add a new numbered file after
approval (`AGENTS.md` §14).

Current migration set:

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Core hotel / rooms / inquiries |
| `002_admin_users.sql` | Admin auth |
| `003_tariff_rates.sql` | Tariffs |
| `004_bookings.sql` | Bookings |
| `005_room_type_inventory_dates.sql` | Stop-sell / allotment / overbooking |
| `006_booking_admin_notes.sql` | Private `bookings.admin_notes` |

Local development already has `001`–`006`. Non-local apply is a **manual operator
action** — see [§6](#6-migration-005--006-safe-rollout).

### 3.4 Start

```bash
cd backend
npm run start          # node server.js
# local only:
npm run dev            # nodemon server.js
```

### 3.5 Health verification

```bash
curl -sS https://api.example.com/health
```

Expect JSON with `success: true`, `status: "healthy"`, and database connectivity
metadata. Do not treat a process that listens but fails `/health` as healthy.

### 3.6 Process / restart strategy

- Run under a process manager or platform supervisor (systemd, PM2, Render,
  Railway, etc.) with **auto-restart** on crash.
- Zero-downtime: prefer rolling restart of API instances **after** migrations that
  are additive/compatible (005/006 are additive).
- Persist `backend/uploads/` across restarts (named volume or object storage).
  Multiple API replicas without shared storage will break media URLs.

### 3.7 Logging

- Prefer structured platform logs (stdout/stderr).
- Never log `JWT_SECRET`, `DB_PASSWORD`, `SMTP_PASS`, raw Authorization headers,
  or full payment data (none today).
- Console email provider may log subject + short text preview — acceptable for
  staging; tighten for production if PII policy requires it.
- With `NODE_ENV=production`, API error middleware must not return stack traces
  to clients (current behaviour).

---

## 4. Frontend deployment

Commands are from `frontend/package.json` (Next.js **16**).

### 4.1 Install

```bash
cd frontend
npm install
```

### 4.2 Production build

Set `NEXT_PUBLIC_*` **before** build (values are inlined):

```bash
# placeholders — substitute real public origins
export NEXT_PUBLIC_API_BASE_URL=https://api.example.com
export NEXT_PUBLIC_SITE_URL=https://www.example.com

cd frontend
npm run build
```

Confirm exit code 0.

### 4.3 Start / host

```bash
cd frontend
npm run start          # next start (default :3000)
```

Or deploy the build output to a Next-compatible host (e.g. Vercel). Ensure the
platform injects the same `NEXT_PUBLIC_*` values used at build time.

### 4.4 Backend connectivity verification

1. Open the deployed site; hotel list / detail should load from the API.
2. Browser network tab: requests go to `NEXT_PUBLIC_API_BASE_URL`, not localhost.
3. If CORS errors appear, add the exact frontend origin to backend
   `FRONTEND_URL` and restart the API.
4. Smoke: guest `/book` availability call and admin login against the API origin.

---

## 5. PostgreSQL deployment

### 5.1 Conceptual setup

1. Provision a dedicated database (e.g. `m2n_hotels_prod`) and application role
   (e.g. `m2n_app`).
2. Prefer managed Postgres with automated backups and point-in-time recovery.
3. Connect the API via `DATABASE_URL` with `sslmode=require` (or `DB_SSL=true`).

### 5.2 Least privilege

- App role: `CONNECT` + DML/DDL needed for migrations **or** split:
  - migrator role (DDL) used only during `npm run migrate`
  - runtime role (DML) for `node server.js`
- No superuser for the application.
- Do not grant the app role access to unrelated databases.

### 5.3 SSL

- **Staging/production:** require TLS to Postgres.
- Local: `DB_SSL=false` is acceptable on loopback.

### 5.4 Backup before migrations

Always take a **verified** backup (snapshot or `pg_dump`) before applying any
pending migration on a shared environment. Confirm restore procedure exists
before cutover.

### 5.5 Migration execution

From a secure operator workstation or one-off job with DB credentials:

```bash
cd backend
# env already points at TARGET database (staging/prod) via secrets
npm run migrate
```

Inspect `schema_migrations` afterwards. Prefer running migrate **once** per
environment from a single job to avoid concurrent migrators.

---

## 6. Migration 005 / 006 safe rollout

**This section is a checklist only. Do not execute it against non-local
environments from an AI session unless an operator explicitly runs it.**

Local development already applied `005` and `006`. Staging/production may still
be behind (often through `004` or earlier).

### 6.1 Required order

1. **Backup** the target database; store restore instructions.
2. **Verify target environment** — confirm host, DB name, and that secrets point
   at staging vs production (never mix).
3. **Inspect `schema_migrations`**

   ```sql
   SELECT filename, executed_at
   FROM schema_migrations
   ORDER BY filename;
   ```

4. **Verify pending migrations** — expect missing rows for any of
   `005_room_type_inventory_dates.sql` / `006_booking_admin_notes.sql` (and
   earlier files if the environment is older).
5. **Apply** with the existing runner:

   ```bash
   cd backend
   npm run migrate
   ```

6. **Verify migration records** — both filenames present in `schema_migrations`.
7. **Verify inventory schema (005)**

   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'room_type_inventory_dates'
   ORDER BY ordinal_position;
   ```

   Expect columns including `allotment`, `stop_sell`, `overbooking_allowance`,
   `source`, and unique `(hotel_id, room_type_id, inventory_date)`.

8. **Verify `bookings.admin_notes` (006)**

   ```sql
   SELECT data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'bookings'
     AND column_name = 'admin_notes';
   ```

   Expect `data_type = text`, `is_nullable = YES`, default NULL.

9. **Health / API smoke** (against that environment’s API):

   - `GET /health`
   - Public hotels / room types
   - `GET /api/bookings/availability` (sample slug + dates)
   - Admin JWT login + inventory calendar + booking detail
   - Confirm public booking create/lookup **omit** `admin_notes`; admin detail
     **includes** it when set

10. **If verification fails** — stop traffic to the bad release; restore from the
    pre-migration backup if schema/data is inconsistent. See [§9](#9-rollback--recovery).
    Do **not** casually `DROP COLUMN` / `DROP TABLE` on production without a
    written restore plan.

### 6.2 Compatibility notes

- `005` and `006` are **additive**. Application versions that do not yet read
  inventory overrides or `admin_notes` generally remain compatible after migrate.
- Prefer: migrate DB → deploy API that understands 005/006 → deploy frontend.
- Running new API code that **requires** `admin_notes` against a DB missing `006`
  will error on admin booking SELECTs — apply `006` before or with that API
  release.

---

## 7. Security checklist

| # | Control | Status / action |
|---|---------|-----------------|
| 1 | HTTPS on frontend and API | Required in staging/prod |
| 2 | Secrets only in host secret store / `.env` (git-ignored) | Required |
| 3 | Unique strong `JWT_SECRET` per environment | Required |
| 4 | CORS: set `FRONTEND_URL` to exact site origin | Required |
| 5 | Postgres not publicly writable; prefer private network + SSL | Required |
| 6 | Admin auth: bcrypt passwords, Bearer JWT, login rate limit | Implemented |
| 7 | Helmet security headers | Implemented |
| 8 | Body size limits (100kb) + API / write / lookup rate limits | Implemented |
| 9 | `NODE_ENV=production` hides stacks + `trust proxy` | Required on API |
| 10 | Logs must not print secrets or Authorization tokens | Operator discipline |
| 11 | Public booking APIs must not expose or accept `admin_notes` | Implemented + verified locally |
| 12 | Seed passwords rotated after first admin create | Recommended |
| 13 | `uploads/` not world-writable; scan/limit uploads as needed | Ongoing |
| 14 | Hotel photo isolation (slug → folder) preserved on CDN | Required for brand safety |

Details: [`11_SECURITY.md`](11_SECURITY.md).

---

## 8. Pre-production checklist

Concrete checks before calling an environment “ready”:

| Area | Check |
|------|-------|
| Backend health | `GET /health` → healthy + DB connected |
| Public hotels | `GET /api/hotels` returns both properties |
| Public rooms | Room types for a known slug load |
| Guest booking | `/book` stay → rooms → guest → create; confirmation page works |
| Booking lookup | `/booking/[bookingNumber]` with email/phone verification |
| Admin bookings | Login → list/detail → status transition → room assign |
| Inventory | Admin calendar loads; availability numbers sensible |
| Inventory day-edit | Upsert/clear override for one room type/day (JWT) |
| Inquiries | Public POST + admin list/detail/status |
| `admin_notes` privacy | Admin can set/clear; public create rejects; public lookup omits |
| Frontend build | `npm run build` with production `NEXT_PUBLIC_*` |
| CORS | Browser calls from site origin succeed |
| Email | Console or SMTP path verified without leaking SMTP secrets in tickets |
| Backup/restore | Recent backup exists; restore drill documented |
| Migrations | Target `schema_migrations` includes through `006` when that env is cut over |
| Contacts | Placeholder phone/email/address replaced before public launch |

Local smoke helpers (require running API; **local or explicitly targeted**
`TEST_BASE_URL` only):

```bash
cd backend
npm run verify:phase10c
npm run verify:phase10d
npm run verify:phase10i
npm run verify:inventory-dates
# optional: npm run verify:phase10f
```

---

## 9. Rollback / recovery

### 9.1 Application deployment failure (API or web)

1. Redeploy the **previous known-good** release/image/commit.
2. Confirm `/health` and a public page load.
3. Leave the database untouched if migrations were not applied in the failed
   attempt.

### 9.2 Migration-related failure

1. **Stop** further migrates and feature traffic if the schema is half-applied.
2. Capture error logs and `schema_migrations` contents.
3. Prefer **restore from the pre-migration backup** over hand-written destructive
   SQL when unsure.
4. Additive rollback notes (only with explicit operator approval):
   - `006`: `ALTER TABLE bookings DROP COLUMN admin_notes;` then delete the
     `schema_migrations` row — **only** if no production dependency on the
     column remains and backup policy allows.
   - `005`: dropping `room_type_inventory_dates` destroys override data; restore
     from backup is safer than ad-hoc DROP.
5. Do **not** pretend reverse migrations are automatically safe.

### 9.3 Frontend failure

1. Roll back the frontend deployment to the prior build.
2. API can remain if compatible; if the new frontend required new API fields,
   roll API back too or fix forward.
3. Remember `NEXT_PUBLIC_*` are build-time — rebuild when changing API URL.

---

## 10. Future CI/CD (recommended only)

**Not implemented yet.** Suggested pipeline when the team is ready:

1. **PR checks:** lint frontend; `npm run build` (frontend); optional backend
   syntax/smoke against ephemeral Postgres.
2. **Main → staging:** deploy API + web; run migrate job with staging secrets;
   run health + subset of verify scripts with `TEST_BASE_URL` = staging API.
3. **Production:** manual approval gate; backup; migrate; deploy API; deploy web;
   smoke checklist from [§8](#8-pre-production-checklist).
4. Store secrets in GitHub Actions / host secret stores — never in the repo.
5. Keep migration apply **serialized** (one migrator job).

Do not add workflow files until explicitly requested.

---

## 11. Remaining blockers

Before a real staging/production cutover, resolve:

1. Final **hostnames** for frontend + API (fill staging/production URL table).
2. Provisioned **Postgres** with backups + SSL.
3. Platform **secrets** (`JWT_SECRET`, DB URL, SMTP if used).
4. Operator-run **migrate** through `006` on each non-local DB (checklist §6).
5. Persistent **uploads** strategy for multi-instance API.
6. Replace **placeholder contact** details before public launch.
7. Optional: CI/CD ([§10](#10-future-cicd-recommended-only)).
8. Optional: object storage / CDN for media (technical debt).

---

*Documentation only. Completing this file does not deploy services or run
non-local migrations.*
