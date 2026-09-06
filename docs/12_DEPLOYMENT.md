# 12 — Deployment

> **Status:** Living document · **Last updated:** 2026-09-06  
> **Scope:** Deployment architecture and readiness for the **current** M2N Hotels
> stack (through Phase 15 Lite: migrations `001`–`009`, tenant isolation,
> self-serve onboarding, read-only operator billing, post-`009` seed scripts).  
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
6. [Staging cutover runbook (migrations 005–009)](#6-staging-cutover-runbook-migrations-005009)
7. [Security checklist](#7-security-checklist)
8. [Pre-production checklist](#8-pre-production-checklist)
9. [Rollback / recovery](#9-rollback--recovery)
10. [Future CI/CD (recommended only)](#10-future-cicd-recommended-only)
11. [Deployment risks](#11-deployment-risks)
12. [Remaining blockers](#12-remaining-blockers)

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
| `007_booking_notification_preferences.sql` | Guest notification prefs JSONB |
| `008_booking_payments_and_invoices.sql` | Phase 14 Lite ledger + invoices |
| `009_tenancy_lite.sql` | Phase 15 Lite — `tenants`, `tenant_memberships`, `hotels.tenant_id` |

**Migration runner behaviour** (`scripts/runMigrations.js`):

- Applies pending `migrations/*.sql` in **alphabetical filename order**.
- **Skips** files already recorded in `schema_migrations` (safe to re-run).
- Each **new** file runs inside a **transaction** (SQL + insert into
  `schema_migrations`); rolls back that file on error.
- **Never** manually `INSERT` into `schema_migrations` without executing and
  validating the matching SQL file.

Local development should already have `001`–`009`. **Staging and production must
reach `009` before deploying the current Phase 15 API** (`main` at `3f65b11` and
later). The API expects `tenants`, `tenant_memberships`, and `hotels.tenant_id`
for tenant isolation, self-serve onboarding, and `GET /api/admin/tenant`.

Non-local apply is a **manual operator action** — see
[§6 Staging cutover runbook](#6-staging-cutover-runbook-migrations-005009).

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
  are additive/compatible (`005`–`009` are additive).
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

## 6. Staging cutover runbook (migrations 005–009)

**This section is a checklist only. Do not execute it against non-local
environments from an AI session unless an operator explicitly runs it.**

Local development should already have `001`–`009`. Staging/production may still
be behind (often through `004` or earlier). **Deploying the current Phase 15 API
without migration `009` will fail** — tenant isolation, onboarding, and billing
routes expect `tenants`, `tenant_memberships`, and `hotels.tenant_id`.

### 6.1 Phase 15 deployment prerequisites

After `009_tenancy_lite.sql` is applied and verified:

| Object | Purpose |
|--------|---------|
| `tenants` | Operator / SaaS billing account (`slug`, `status`, `plan_code`, `subscription_status`, trial/period dates) |
| `tenant_memberships` | Links `admin_users` to tenants (`owner` / `admin` / `staff`) |
| `hotels.tenant_id` | Property ownership; every hotel row must reference a tenant |

Migration `009` **backfills** a default tenant (`m2n-hotels`) and assigns all
existing hotels and active admin users to it. New properties can also be created
via **self-serve onboarding** (`POST /api/admin/onboarding`, public, rate-limited)
and the admin UI at `/admin/onboarding`.

**Demo / reference hotel seed** (`npm run seed` / `npm run seed:admin`, commit
`be2351a`) is **compatible after `009`**. Seed resolves existing `m2n-hotels`,
sets `tenant_id` on hotel INSERT only (reruns do not move tenants), never creates
tenants, and `seed:admin` ensures an `owner` membership without reactivating
inactive admins/memberships. See [`03_DATABASE.md`](03_DATABASE.md) §6.

Operators can view a **read-only tenant/billing summary** after login:
`GET /api/admin/tenant` (JWT) and `/admin/billing` (no payment gateway; Lite stub only).

### 6.2 Safe staging deployment order

Execute in this order on the **target staging environment**:

1. **Backup** the target database; store restore instructions.
2. **Verify target environment** — confirm host, DB name, and that secrets point
   at staging vs production (never mix).
3. **Inspect `schema_migrations`** (read-only) — see [§6.3](#63-powershell--psql-examples).
4. **Confirm pending migrations** — identify any missing `005`–`009` filenames.
5. **Run migrate** from `backend/` with staging `DATABASE_URL` / `DB_*` set:

   ```bash
   cd backend
   npm run migrate
   ```

   The runner skips already-recorded files; each new file runs transactionally.
   **Never** manually `INSERT` into `schema_migrations` without executing and
   validating the SQL file.
6. **Verify schema through `009`** — tables, columns, backfill (§6.4), including
   default tenant `m2n-hotels`.
7. **Confirm staging DB target again** before any seed writes.
8. **Seed reference data** (when the environment needs demo hotels / first admin):

   ```bash
   cd backend
   npm run seed
   npm run seed:admin   # requires ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD
   ```

   Safe after full `001`–`009`. Do **not** delay or skip `009` to seed.
   (Superseded: any pre-`be2351a` advice to seed before `009`.)
9. **Read-only DB / API verification** — hotel count, `hotels.tenant_id`, admin
   membership; `GET /` and `GET /health`; `GET /api/hotels` returns seeded
   properties when seed ran.
10. **Deploy backend** (API) with staging secrets (`NODE_ENV=production`,
    `JWT_SECRET`, `DATABASE_URL` or `DB_*`, `FRONTEND_URL`, optional email vars)
    if not already deployed.
11. **Verify API roots** — `GET /` and `GET /health` on the staging API origin.
12. **Run Phase 15 verifiers** against staging (§6.6) with
    `TEST_BASE_URL=https://api-staging.example.com` (placeholder).
13. **Configure frontend build-time env** — `NEXT_PUBLIC_API_BASE_URL` (or legacy
    `NEXT_PUBLIC_API_URL`), `NEXT_PUBLIC_SITE_URL`.
14. **Build and deploy frontend** (`npm run build` then host `next start` or platform deploy).
15. **Browser / application smoke tests** — matrix in [§6.5](#65-post-deploy-smoke-matrix).

Prefer: **backup → migrate through 009 → confirm target → seed → verify →
deploy/verify API → verifiers → build/deploy web → smoke**.

When staging already has migrations `001`–`009` and a healthy API but empty hotel
data, the remaining operational step is **confirm staging DB → `npm run seed` →
`npm run seed:admin` (if needed) → verify `GET /api/hotels`**.

### 6.2.1 Current staging facts (as of 2026-09-06)

| Fact | State |
|------|-------|
| Staging PostgreSQL DB name | `m2n_hotel_staging` |
| Migrations | `001`–`009` applied |
| Migration runner re-run | Idempotent |
| Staging backend | Deployed; `/` + `/health` healthy; DB connected |
| Staging API origin | `https://m2n-hotel-staging-api.onrender.com` |
| Public hotels | **Seeded** — live `GET /api/hotels` **count=2** |
| Default tenant `m2n-hotels` | Present (verified) |
| Staging `seed` / `seed:admin` | **COMPLETE** (`super_admin` + active `owner`) |
| Seed scripts on `main` | Post-`009` compatible (`be2351a`) |
| Staging admin login smoke | **COMPLETE** (`role=super_admin`, `token_type=Bearer`) |
| Staging `GET /api/admin/tenant` | **COMPLETE** (`slug=m2n-hotels`, `plan=lite`, `subscription_status=active`) |
| Staging frontend setup/deploy | **NOT STARTED** |
| Production | **NOT STARTED** — do not modify |

Also remember: Render ephemeral `uploads/` risk; frontend API URL is build-time;
CORS requires exact `FRONTEND_URL`.

### 6.2.2 Operator Node seed / migrate against Render Postgres (SSL)

`backend/config/db.js` enables SSL for `DATABASE_URL` only when:

- `DB_SSL=true` (or `1`), or
- `NODE_ENV=production`, or
- the URL contains `sslmode=require`

Otherwise the pool uses `ssl: false`. **psql** may still connect (libpq often
prefers TLS) while **`npm run seed`** fails with `SSL/TLS required`.

**Before** local/operator `npm run migrate` / `npm run seed` / `seed:admin`
against staging:

```powershell
# Session only — do not commit secrets
$env:DB_SSL = "true"
# Prefer also ensuring DATABASE_URL includes sslmode=require
# Optional: $env:NODE_ENV = "production"
```

Failed seed that errors on SSL before “Default tenant resolved” performs **no**
hotel/admin writes (first query is the tenant SELECT).

See [ADR-0044](history/DECISIONS.md).

### 6.2.3 Staging admin login smoke (COMPLETE)

Verified on staging after seed:

1. `POST /api/admin/auth/login` — success; `role=super_admin`;
   `token_type=Bearer` (do not paste tokens into docs/chat).
2. `GET /api/admin/tenant` with Bearer JWT — success; `slug=m2n-hotels`;
   `plan=lite`; `subscription_status=active`.
3. Note: login **updates** `admin_users.last_login_at` only.

**Next operational milestone:** **STAGING FRONTEND SETUP / DEPLOYMENT**
(NOT STARTED).

### 6.3 PowerShell / psql examples

Use the PostgreSQL 17 client (adjust path if your install differs):

```powershell
$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$env:PGPASSWORD = "<DB_PASSWORD_PLACEHOLDER>"
$conn = "-h <DB_HOST_PLACEHOLDER> -p 5432 -U <DB_USER_PLACEHOLDER> -d <DB_NAME_PLACEHOLDER>"
```

**Inspect applied migrations (read-only):**

```powershell
& $psql $conn -c "SELECT filename, executed_at FROM schema_migrations ORDER BY filename;"
```

**Identify missing 005–009** (expect zero rows when fully migrated):

```powershell
& $psql $conn -c @"
SELECT f AS missing_migration
FROM (VALUES
  ('005_room_type_inventory_dates.sql'),
  ('006_booking_admin_notes.sql'),
  ('007_booking_notification_preferences.sql'),
  ('008_booking_payments_and_invoices.sql'),
  ('009_tenancy_lite.sql')
) AS required(f)
WHERE f NOT IN (SELECT filename FROM schema_migrations);
"@
```

**Check tenants (Phase 15 backfill):**

```powershell
& $psql $conn -c "SELECT id, slug, name, status, plan_code, subscription_status FROM tenants ORDER BY slug;"
```

**Check tenant_memberships:**

```powershell
& $psql $conn -c @"
SELECT tm.id, t.slug AS tenant_slug, au.email, tm.membership_role, tm.is_active
FROM tenant_memberships tm
JOIN tenants t ON t.id = tm.tenant_id
JOIN admin_users au ON au.id = tm.admin_user_id
ORDER BY t.slug, au.email;
"@
```

**Check hotels.tenant_id** (every hotel should have a non-null `tenant_id` after 009):

```powershell
& $psql $conn -c @"
SELECT h.slug, h.name, t.slug AS tenant_slug, h.tenant_id IS NOT NULL AS has_tenant
FROM hotels h
LEFT JOIN tenants t ON t.id = h.tenant_id
ORDER BY h.slug;
"@
```

**Run migrations** (from repo root; env must point at target DB):

```powershell
cd C:\path\to\M2N_Hotels\backend
# Ensure DATABASE_URL or DB_* in environment / .env targets STAGING only
npm run migrate
```

Replace `<DB_*_PLACEHOLDER>` and connection values with staging secrets from the
host secret store — never commit real passwords or hostnames.

### 6.4 Schema verification after migrate

**005 — `room_type_inventory_dates`:**

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'room_type_inventory_dates'
ORDER BY ordinal_position;
```

Expect columns including `allotment`, `stop_sell`, `overbooking_allowance`,
`source`, and unique `(hotel_id, room_type_id, inventory_date)`.

**006 — `bookings.admin_notes`:**

```sql
SELECT data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
  AND column_name = 'admin_notes';
```

Expect `text`, nullable, default NULL.

**007 — notification preferences** (column on `bookings`):

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
  AND column_name = 'notification_preferences';
```

**008 — payments / invoices tables:**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('booking_payments', 'booking_invoices', 'hotel_invoice_sequences')
ORDER BY table_name;
```

**009 — tenancy:**

```sql
SELECT COUNT(*) AS tenant_count FROM tenants;
SELECT COUNT(*) AS hotels_without_tenant FROM hotels WHERE tenant_id IS NULL;
```

Expect `hotels_without_tenant = 0` after successful `009`.

### 6.5 Post-deploy smoke matrix

| Area | Check |
|------|-------|
| API root | `GET /` returns API metadata |
| Health | `GET /health` → healthy + DB connected |
| Public hotels | `GET /api/hotels` returns properties |
| Admin login | `/admin/login` → JWT; token stored in **browser localStorage** |
| Tenant isolation | Admin list/detail scoped to membership tenant; cross-tenant IDs → 404 |
| Onboarding API | `POST /api/admin/onboarding` (public, rate-limited) — staging only with test data |
| Onboarding UI | `/admin/onboarding` form loads; link from login page |
| Tenant summary | `GET /api/admin/tenant` (JWT) returns read-only billing fields |
| Billing UI | `/admin/billing` shows tenant name, plan, subscription status (read-only) |
| Bookings | List/detail, status, room assign, admin create |
| CRM / guests | `/admin/guests` search + Guest 360 |
| Inventory | `/admin/inventory` calendar + day overrides |
| Payments / invoices | Booking detail Payments & Invoices panels (Phase 14 Lite; manual ledger, no gateway) |
| Inquiries | Public POST + admin list/detail/status |
| Front desk | `/admin/front-desk` arrivals / departures / in-house |
| CORS | Browser calls from `FRONTEND_URL` origin succeed; wrong origin blocked |
| Media / uploads | Admin upload works; **note:** `backend/uploads/` is local disk — see [§11](#11-deployment-risks) |

Payment gateway / Stripe / Razorpay: **not implemented** — do not expect checkout or live card capture.

### 6.6 Verification commands (`backend/package.json`)

Run from `backend/` with API reachable. Set `TEST_BASE_URL` to the staging API
origin when verifying a remote environment (default `http://localhost:5001`).

| Script | Scope |
|--------|-------|
| `npm run verify:phase15` | Tenant isolation + admin AuthZ (requires `009`) |
| `npm run verify:phase15-onboarding` | Self-serve onboarding API |
| `npm run verify:phase15-billing` | `GET /api/admin/tenant` + billing stub |
| `npm run verify:phase14` | Payments + invoices APIs |
| `npm run verify:crm` | Guest search + Guest 360 |
| `npm run verify:front-desk` | Front desk board + status actions |
| `npm run verify:phase10i` | Persistent inventory dates |
| `npm run verify:inventory-dates` | Admin inventory date write APIs |
| `npm run verify:phase10c` | Admin bookings console |
| `npm run verify:phase10d` | Inventory engine |
| `npm run verify:phase10f` | Booking emails (optional) |
| `npm run verify:notification-prefs` | Guest notification preferences |
| `npm run verify:admin-stay-modify` | Admin stay modification |
| `npm run verify:guest-stay-modify` | Guest stay modification |

**Staging cutover minimum** (after migrate + API deploy):

```bash
cd backend
export TEST_BASE_URL=https://api-staging.example.com   # placeholder
npm run verify:phase15
npm run verify:phase15-onboarding
npm run verify:phase15-billing
npm run verify:phase14
npm run verify:crm
npm run verify:front-desk
```

PowerShell equivalent:

```powershell
cd C:\path\to\M2N_Hotels\backend
$env:TEST_BASE_URL = "https://api-staging.example.com"
npm run verify:phase15
npm run verify:phase15-onboarding
npm run verify:phase15-billing
```

### 6.7 Compatibility notes

- Migrations `005`–`009` are **additive**. Prefer: migrate DB → seed (if needed)
  → deploy API that understands new schema → deploy frontend.
- Running Phase 15 API against a DB missing `009` will error on tenant-scoped
  admin routes — apply `009` before or with that API release.
- `009` backfill is safe for existing single-tenant installs; verify `m2n-hotels`
  tenant and hotel links after migrate.
- Hotel seed after `009` is supported (`be2351a`). Do **not** delay `009` solely
  to allow seeding.

### 6.8 If verification fails

1. Stop traffic to the bad release.
2. Capture error logs and `schema_migrations` contents.
3. Restore from the **pre-migration backup** if schema/data is inconsistent.
4. Do **not** casually `DROP COLUMN` / `DROP TABLE` on production without a
   written restore plan. See [§9](#9-rollback--recovery).

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
| 15 | Tenant isolation: admin JWT scoped via `tenant_memberships` | Implemented (Phase 15 Lite) |
| 16 | Public onboarding rate-limited (`POST /api/admin/onboarding`) | Implemented |
| 17 | Admin JWT in browser `localStorage` — XSS risk; use HTTPS only | Known limitation |
| 18 | No payment gateway secrets in repo; booking payments are manual ledger only | Required |

Details: [`11_SECURITY.md`](11_SECURITY.md).

---

## 8. Pre-production checklist

Concrete checks before calling an environment “ready”:

| Area | Check |
|------|-------|
| Backend health | `GET /health` → healthy + DB connected |
| API root | `GET /` responds on API origin |
| Public hotels | `GET /api/hotels` returns both properties |
| Public rooms | Room types for a known slug load |
| Guest booking | `/book` stay → rooms → guest → create; confirmation page works |
| Booking lookup | `/booking/[bookingNumber]` with email/phone verification |
| Admin bookings | Login → list/detail → status transition → room assign |
| Inventory | Admin calendar loads; availability numbers sensible |
| Inventory day-edit | Upsert/clear override for one room type/day (JWT) |
| Inquiries | Public POST + admin list/detail/status |
| `admin_notes` privacy | Admin can set/clear; public create rejects; public lookup omits |
| Phase 15 tenancy | `tenants` + `tenant_memberships` + `hotels.tenant_id` verified after `009` |
| Tenant isolation | Admin cannot read another tenant's hotel/booking by ID |
| Onboarding | `/admin/onboarding` + `POST /api/admin/onboarding` (staging test account) |
| Billing stub | `/admin/billing` + `GET /api/admin/tenant` (read-only; no gateway) |
| CRM / guests | `/admin/guests` search + profile |
| Front desk | `/admin/front-desk` board actions |
| Payments / invoices | Booking detail ledger + invoice draft/issue (Phase 14 Lite) |
| Frontend build | `npm run build` with production `NEXT_PUBLIC_*` |
| CORS | Browser calls from `FRONTEND_URL` origin succeed |
| Email | Console or SMTP path verified without leaking SMTP secrets in tickets |
| Backup/restore | Recent backup exists; restore drill documented |
| Migrations | Target `schema_migrations` includes through `009` when that env is cut over |
| Contacts | Placeholder phone/email/address replaced before public launch |

Local / staging smoke helpers (require running API; set `TEST_BASE_URL` for remote):

```bash
cd backend
npm run verify:phase15
npm run verify:phase15-onboarding
npm run verify:phase15-billing
npm run verify:phase14
npm run verify:crm
npm run verify:front-desk
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

## 11. Deployment risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **`backend/uploads/` local disk** | Media files are lost on ephemeral disks or invisible across API replicas | Use a persistent volume, single instance, or future object storage/CDN before scaling API horizontally |
| **`NEXT_PUBLIC_*` build-time** | Wrong API URL baked into frontend until rebuild | Set `NEXT_PUBLIC_API_BASE_URL` (or legacy `NEXT_PUBLIC_API_URL`) correctly **before** `npm run build`; redeploy web after API URL changes |
| **CORS `FRONTEND_URL`** | Browser blocks API calls if origin mismatch | Set backend `FRONTEND_URL` to the **exact** browser origin (scheme + host + port); restart API after change |
| **JWT in `localStorage`** | Token readable to any same-origin script; XSS exposes admin session | HTTPS only; strict CSP where possible; no third-party scripts on admin pages; future httpOnly cookie auth is not implemented |
| **Public onboarding** | `POST /api/admin/onboarding` creates tenants without admin login | Rate-limited; monitor abuse on staging; do not disable limiter |
| **Payment gateway not implemented** | No Stripe/Razorpay/checkout; guest bookings are not prepaid online | Phase 14 Lite is manual ledger + invoice draft only; do not configure gateway env vars — none exist |
| **Migration `009` required** | Phase 15 API errors without tenancy tables | Migrate through `009` before deploying current `main`; never fake `schema_migrations` rows |
| **Secrets in git** | Credential leak | Use host secret store; templates only in `.env.example` |

---

## 12. Remaining blockers

Before a real staging/production cutover, resolve:

1. Final **hostnames** for frontend + API (fill staging/production URL table).
2. Provisioned **Postgres** with backups + SSL.
3. Platform **secrets** (`JWT_SECRET`, DB URL, SMTP if used).
4. Operator-run **migrate** through **`009`** on each non-local DB (runbook [§6](#6-staging-cutover-runbook-migrations-005009)).
5. Persistent **uploads** strategy for multi-instance API.
6. Replace **placeholder contact** details before public launch.
7. Optional: CI/CD ([§10](#10-future-cicd-recommended-only)).
8. Optional: object storage / CDN for media (technical debt).
9. Optional: live SaaS **payment gateway** (Phase 15 full — not in Lite; do not start without approval).

---

*Documentation only. Completing this file does not deploy services or run
non-local migrations.*
