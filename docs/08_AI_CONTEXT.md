# 08 — AI Context

> **Status:** Living document · **Last updated:** 2026-08-19  
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
- **Phases 1–9 and 10A–10I complete** (public site, admin console, booking
  engine, inventory calendar, emails, inquiries, persistent inventory dates).
- Availability uses physical rooms + blocking bookings, plus optional sparse
  `room_type_inventory_dates` overrides (stop-sell / allotment / overbooking).
  Admin write APIs: `PUT`/`DELETE /api/admin/inventory/dates`; day-edit UI on
  `/admin/inventory`.
- **Next:** Phase 13 CRM Lite (search + 360 + open leads) ✅; Phase 14 Lite
  backend (ledger + invoices) ✅; admin finance UI next; Full CRM / dated
  follow-ups only if approved; Phase 15; operator staging cutover
  ([12 — Deployment](12_DEPLOYMENT.md)). Non-local migrate for `005`–`008`
  still pending.
- Guest cancel / modify / notification prefs: contact-verified
  `POST /api/bookings/:bookingNumber/{cancel,modify,notification-preferences}`.
- Admin cancel: `POST /api/admin/bookings/:id/cancel`; stay modify via hardened
  `PATCH /api/admin/bookings/:id`.
- Prefs: migration `007` `notification_preferences` JSONB; status emails gated;
  confirm/cancel ungated ([ADR-0034](history/DECISIONS.md)).
- Bookings carry private `admin_notes` (admin JWT only; never public).
- CRM Lite guests are a read model over bookings/inquiries (`/admin/guests`);
  no guests table ([ADR-0039](history/DECISIONS.md)). Open leads reuse inquiry
  statuses; notes stay on source records ([ADR-0040](history/DECISIONS.md)).
- Phase 14 Lite finance: hotel-scoped `booking_payments` / `booking_invoices`
  ([ADR-0041](history/DECISIONS.md)). Admin JWT nested under
  `/api/admin/bookings/:id/payments` and `/invoices`. No UI, no gateway.
- Deployment readiness is documented; do not treat docs as an executed deploy.
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
| Admin shell | `frontend/src/components/admin/AdminGuard.js` (full-width desktop) |
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
