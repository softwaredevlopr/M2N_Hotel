# 08 — AI Context

> **Status:** Living document · **Last updated:** 2026-08-02  
> **Purpose:** Minimum reliable context for assistants working in this repo.

---

## 1. Read first

1. [`../AGENTS.md`](../AGENTS.md)
2. [`../README.md`](../README.md)
3. [01 — Project Status](01_PROJECT_STATUS.md)
4. [13 — Roadmap](13_ROADMAP.md)

## 2. Project facts

- Frontend Next.js `:3000` · Backend Express `:5001` · PostgreSQL.
- Hotels: Aurelia Grand, Zaarang Inn (slug-scoped).
- **Phases 1–9 complete** (public site, inquiries, admin auth + hotels/room types/rooms/media/tariffs).
- **Phase 10A complete** — booking backend: `bookings` table, availability engine
  with overbooking protection, public + admin booking APIs.
- **Phase 10B complete** — guest booking UI: `/book` three-step flow with a live
  stay summary, and `/booking/[bookingNumber]` confirmation + contact-verified
  lookup. Frontend only; no new endpoints, no payment gateway.
- **Next:** Phase 10C — admin bookings module and per-date inventory rules.
- Tariff matrix: `GET /api/tariffs`; room-card packages may still use `lib/tariffs.js`.

## 3. Hard rules

- Never mix hotel photos; use slug → folder mapping.
- Do not change DB schema without explicit approval.
- Do not invent columns, prices, or endpoints — confirm or `TODO`.
- Documentation-only requests must not change application code.
- Prefer existing patterns (admin CRUD modules, `apiResponse`, validators).

## 4. Key locations

| Purpose | Path |
|---------|------|
| Public routes | `frontend/src/app/` |
| Admin UI | `frontend/src/app/admin/` |
| Admin libs | `frontend/src/lib/admin*.js` |
| API mount | `backend/routes/index.js` |
| Schema | `backend/migrations/` |

## 5. Phase cheat sheet

| Phase | Topic |
|-------|--------|
| 1–2 | Public site + inquiries |
| 3 | JWT admin auth |
| 4–7 | Hotels, room types, rooms, media admin |
| 8 | Wire public UI to APIs |
| 9–15 | Rates → inventory → booking → PMS → CRM → payments → SaaS |
