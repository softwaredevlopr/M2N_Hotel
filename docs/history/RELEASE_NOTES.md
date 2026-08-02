# Release Notes

> **Related:** [`../CHANGELOG.md`](../CHANGELOG.md) · [`DECISIONS.md`](DECISIONS.md) · [`../13_ROADMAP.md`](../13_ROADMAP.md)

---

## Conventions

Newest first. Phase numbers match the product roadmap (Phases 1–15).

---

## Unreleased

### Phase 10A — Booking Engine Backend Foundation (2026-08-02)

- `bookings` table (migration `004`) with unique human-readable booking numbers,
  multi-property `hotel_id` scoping, booking/payment status and source
  constraints, amounts, and audit stamps.
- Public `POST /api/bookings` and contact-verified
  `GET /api/bookings/:bookingNumber`; admin JWT list, detail, create, update,
  status and room-assignment endpoints.
- Overbooking protection: per-night peak occupancy inside a transaction with an
  advisory lock per hotel + room type ([ADR-0014](DECISIONS.md)).
- `npm run test:bookings` — 64 checks, self-cleaning.
- No frontend booking pages yet (Phase 10B), and no payments, OTA or channel
  manager.

### Fix — Hotel Zaarang Inn real photography restored (2026-08-02)

- Zaarang Inn's `hotel_media` rows were seeded stock Unsplash placeholders that, after
  the Phase 8 API-first switch, outranked its real `Photos/Zaarang-Inn/**` images.
- Seed now builds Zaarang's 17 media rows from its own photo folders; the 4 stock rows
  were set to `inactive` (nothing deleted). Hero is `Photos/Zaarang-Inn/Hero/1.jpg`.
- Stock/demo image hosts are now rejected outright, and hotel-level image fallbacks stay
  inside the hotel's own folder ([ADR-0013](DECISIONS.md)). Aurelia Grand unchanged.

### Phase 9 — Tariff & Rate Management (2026-08-02)

- `tariff_rates` schema, public `GET /api/tariffs`, admin CRUD, `/admin/tariffs` UI.
- Public matrix uses API; empty price cells show “Available with room plan”.

### Phase 8 — Public Website Dynamic Integration (2026-08-02)

- Hotel detail pages driven by `GET /api/hotels/:slug`, `GET /api/rooms/types`, and inquiry API.
- API-first media, amenities, contact, policies; loading/error states on public routes.
- Meal-plan tariff matrix still from `lib/tariffs.js` until Phase 9.

### Documentation
- Roadmap consolidated to Phases 1–15; docs suite refreshed (README, status, API, DB, architecture).

### Next engineering target
- **Phase 10** — Availability & inventory.

---

## Platform milestone — Phases 1–9 complete (2026-08)

### Highlights
- Public multi-hotel website with premium hotel detail pages.
- Booking inquiry pipeline end-to-end.
- JWT admin console managing hotels, room types, rooms, and media.
- PostgreSQL-backed REST API with security baseline (Helmet, CORS, rate limits).

### Phase-by-phase

| Phase | Delivered |
|-------|-----------|
| 1 Public Website | Multi-hotel Next.js site, Photos folders, SEO, detail UX |
| 2 Booking Inquiry | `InquiryForm` → `POST /api/inquiries` |
| 3 Admin Authentication | `admin_users`, JWT login, `/admin` shell |
| 4 Hotel Management | `/admin/hotels` + `/api/admin/hotels` |
| 5 Room Type Management | `/admin/room-types` + `/api/admin/room-types` |
| 6 Rooms Management | `/admin/rooms` + `/api/admin/rooms` |
| 7 Hotel Media Management | `/admin/media` + `/api/admin/media` upload |

### Notes
- Public GET contracts for hotels/rooms were kept stable while admin write APIs were added.
- Some features encode extras without schema changes (room-type featured in `metadata`,
  media categories in upload URL paths).

---

## Earlier work (folded into Phase 1)

- Hotel-wise image architecture and slug routing.
- Production launch hardening (SEO, security, a11y, performance).
- Tariff/meal-plan UI iterations driven by `lib/tariffs.js` (pending Phase 9 for DB rates).
