# 08 — AI Context

> **Status:** Living document · **Last updated:** 2026-09-03  
> **Purpose:** Minimum reliable context for assistants working in this repo.

---

## 1. Read first

1. [`../AGENTS.md`](../AGENTS.md)
2. [`../README.md`](../README.md)
3. [01 — Project Status](01_PROJECT_STATUS.md)
4. [13 — Roadmap](13_ROADMAP.md)
5. [12 — Deployment](12_DEPLOYMENT.md) (before any staging/prod action)

## 2. Project facts

- Frontend Next.js **16.2.6** `:3000` · Backend Express `:5001` · PostgreSQL.
- Hotels: Aurelia Grand, Zaarang Inn (slug-scoped Photos).
- **Phases 1–15 Lite complete in code** (booking, inventory, CRM Lite, Phase 14
  ledger, Phase 15 tenancy/onboarding/billing stub, seed post-`009`).
- Schema caveats: `room_types.max_occupancy`, `rooms.floor_label`, no `guests`
  table, `hotels.tenant_id` NOT NULL after `009`.
- Admin JWT in `localStorage`; CORS needs exact `FRONTEND_URL`.
- **No** payment gateway. **No** inventing columns/endpoints.

## 3. Current deployment facts

- Staging DB: `m2n_hotel_staging`; migrations `001`–`009` applied; backend healthy.
- Staging seed + `seed:admin`: **COMPLETE** (`GET /api/hotels` count=2;
  `super_admin` + active `owner` on `m2n-hotels`).
- Staging admin login + tenant smoke: **COMPLETE** (`token_type=Bearer`;
  tenant `slug=m2n-hotels`, `plan=lite`, `subscription_status=active`).
- Operator Node seed against Render: set session `DB_SSL=true` and/or URL
  `sslmode=require` ([ADR-0044](history/DECISIONS.md); [12 §6.2.2](12_DEPLOYMENT.md)).
- **Next task:** **STAGING FRONTEND SETUP / DEPLOYMENT** (NOT STARTED).
- Production: **NOT STARTED**. Do **not** seed/migrate/deploy production without
  explicit approval.

## 4. Hard rules

- Never mix hotel photos; slug → folder mapping.
- Do not change DB schema without approval.
- Do not invent columns, prices, or endpoints.
- Documentation-only requests must not change application code.
- Staging before production; confirm DB target before writes.

## 5. Common commands

```bash
cd backend && npm run migrate && npm run seed && npm run seed:admin && npm run dev
cd frontend && npm run dev
# verifiers (API running): verify:phase15, verify:phase15-onboarding,
# verify:phase15-billing, verify:phase14, verify:crm, verify:front-desk
```

## 6. Key locations

| Purpose | Path |
|---------|------|
| Public routes | `frontend/src/app/` |
| Admin UI | `frontend/src/app/admin/` |
| Admin APIs | `backend/routes/`, `backend/controllers/` |
| Tenancy | `backend/utils/adminTenancy.js` |
| Migrations | `backend/migrations/` |
| Seed | `backend/scripts/seed.js`, `seedAdmin.js` |
