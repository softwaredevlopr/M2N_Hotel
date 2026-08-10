# M2N Hotels

Multi-property hotel web platform: public marketing site + Express/PostgreSQL API + JWT admin console.

| Layer | Stack | Port |
|-------|--------|------|
| Frontend | Next.js (App Router) | `3000` |
| Backend | Node.js + Express | `5001` |
| Database | PostgreSQL | `5432` |

**Live properties:** Aurelia Grand (`m2n-hotel-aurelia-grand`) · Zaarang Inn (`hotel-zaarang-inn`)

---

## Current status (Phases 1–10I complete)

| Phase | Name | Status |
|-------|------|--------|
| 1 | Public Website | ✅ |
| 2 | Booking Inquiry | ✅ |
| 3 | Admin Authentication (JWT) | ✅ |
| 4 | Hotel Management | ✅ |
| 5 | Room Type Management | ✅ |
| 6 | Rooms Management | ✅ |
| 7 | Hotel Media Management | ✅ |
| 8 | Public Website Dynamic Integration | ✅ |
| 9 | Tariff & Rate Management | ✅ |
| 10A | Booking Engine Backend (schema + APIs) | ✅ |
| 10B | Guest Booking UI | ✅ |
| 10C | Admin Booking Management | ✅ module |
| 10D | Availability & Inventory Engine | ✅ |
| 10E | Admin Inventory Calendar UI | ✅ |
| 10F | Booking Confirmation Email & Notifications | ✅ |
| 10G | Admin Create Booking Form | ✅ |
| 10H | Admin Inquiries CRUD UI | ✅ |
| 10I | Persistent inventory dates (stop-sell/allotment/overbooking) + admin date write APIs | ✅ |
| 11–15 | Booking polish, PMS, CRM, payments, SaaS | ⬜ Upcoming |

Full roadmap: [`docs/13_ROADMAP.md`](docs/13_ROADMAP.md) · Status: [`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md)

### Key routes

| Route | Purpose |
|-------|---------|
| `/` · `/about` · `/hotels/[slug]` | Public marketing site |
| `/book` | Guest booking flow (Stay → Rooms → Guest → Review → Confirm) |
| `/booking/[bookingNumber]` | Booking confirmation + contact-verified lookup |
| `/admin/login` → `/admin/*` | Admin console (bookings, inventory, inquiries, hotels, room types, rooms, media, tariffs) |

> Bookings are requests, not prepaid reservations — no payment gateway yet.
> Booking quotes read "Price on request" until a nightly `base_price` is set per
> room type in Admin → Room Types (all seeded values are `0.00`).

---

## Quick start

```bash
# Backend
cd backend
cp .env.example .env   # set DB + JWT_SECRET
npm install
npm run migrate
npm run seed           # optional hotel seed data
npm run seed:admin     # first admin user
npm run dev            # http://localhost:5001

# Frontend (new terminal)
cd frontend
npm install
# optional: NEXT_PUBLIC_API_URL=http://localhost:5001
npm run dev            # http://localhost:3000
```

- Health: `http://localhost:5001/health`
- Admin: `http://localhost:3000/admin/login`

Setup detail: [`docs/06_SETUP_GUIDE.md`](docs/06_SETUP_GUIDE.md)

---

## Documentation map

| Document | Description |
|----------|-------------|
| [`AGENTS.md`](AGENTS.md) | AI / contributor operating rules |
| [`PROJECT_DOCS.md`](PROJECT_DOCS.md) | Legacy master index (preserved) |
| [`TODO.md`](TODO.md) | Active task tracker |
| [`docs/00_PROJECT_OVERVIEW.md`](docs/00_PROJECT_OVERVIEW.md) | Vision & scope |
| [`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md) | What is done / next |
| [`docs/02_ARCHITECTURE.md`](docs/02_ARCHITECTURE.md) | Architecture & diagrams |
| [`docs/03_DATABASE.md`](docs/03_DATABASE.md) | Schema & tables |
| [`docs/04_API.md`](docs/04_API.md) | API reference |
| [`docs/05_FOLDER_STRUCTURE.md`](docs/05_FOLDER_STRUCTURE.md) | Repo layout |
| [`docs/13_ROADMAP.md`](docs/13_ROADMAP.md) | Phases 1–15 roadmap |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Detailed changelog |
| [`docs/history/`](docs/history/) | ADRs & release notes |

Convenience aliases (same content pointers):

- [`docs/ROADMAP.md`](docs/ROADMAP.md) → roadmap  
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) → architecture  
- [`docs/DATABASE.md`](docs/DATABASE.md) → database  
- [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) → API  
- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) → status  

---

## Hard rules (summary)

- Do **not** change the database schema without explicit approval.
- Hotel photos: slug → folder mapping only; never mix hotels’ images.
- Do **not** invent endpoints, columns, or prices — confirm from code/docs or use `TODO`.
- Secrets stay in `.env` (never commit).

See [`AGENTS.md`](AGENTS.md) for the full policy.
