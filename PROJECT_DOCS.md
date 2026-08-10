# M2N Hotels — Project Documentation

> **Last updated:** July 2026  
> **Purpose:** Master index and long-form reference. For the current roadmap and
> status, prefer [`README.md`](README.md), [`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md),
> and [`docs/13_ROADMAP.md`](docs/13_ROADMAP.md).

---

## Project Documentation Flow

**`PROJECT_DOCS.md` is the master index and source of truth for the project.**
Start here, then follow the flow downward — each layer adds more specific detail:

```
README.md            ← Quick start & doc map
      ↓
PROJECT_DOCS.md      ← Master index & source of truth (start here for deep context)
      ↓
AGENTS.md            ← AI operating manual (rules & workflow)
      ↓
docs/                ← Structured documentation set (topic-wise)
      ↓
docs/history/        ← Decisions (ADR) & version-wise release notes
```

- **[`README.md`](README.md)** — quick start, status snapshot, links.
- **[`PROJECT_DOCS.md`](PROJECT_DOCS.md)** — this file. Authoritative long-form entry:
  project vision, tech stack, current status, image rules, and pending tasks.
- **[`AGENTS.md`](AGENTS.md)** — permanent operating manual for any AI assistant
  (rules, conventions, workflow, and things that must never change without approval).
- **[`docs/`](docs/)** — detailed, topic-wise documentation (overview, architecture,
  database, API, setup, coding rules, business rules, security, deployment, roadmap, etc.).
- **[`docs/history/`](docs/history/)** — long-term history:
  [`DECISIONS.md`](docs/history/DECISIONS.md) (architectural decisions) and
  [`RELEASE_NOTES.md`](docs/history/RELEASE_NOTES.md) (version-wise release history).

> Any AI or contributor should be able to continue this project by reading
> `PROJECT_DOCS.md` → `AGENTS.md` → `docs/` → `docs/history/`.

---

## 1. Project Vision

M2N Hotels started as a single-hotel website and is now a **multi-property platform**
with a JWT admin console. The long-term goal remains **multi-tenant SaaS**.

**Product roadmap (canonical):** [`docs/13_ROADMAP.md`](docs/13_ROADMAP.md)

| Phase | Name | Status |
|-------|------|--------|
| 1 | Public Website | ✅ |
| 2 | Booking Inquiry | ✅ |
| 3 | Admin Authentication | ✅ |
| 4 | Hotel Management | ✅ |
| 5 | Room Type Management | ✅ |
| 6 | Rooms Management | ✅ |
| 7 | Hotel Media Management | ✅ |
| 8 | Public Website Dynamic Integration | ✅ |
| 9 | Tariff & Rate Management | ✅ |
| 10A | Booking engine backend (schema + APIs) | ✅ Complete |
| 10B | Guest booking UI (`/book` + confirmation) | ✅ Complete |
| 10C | Admin bookings module + dashboard stats | ✅ Module done |
| 10D | Availability & inventory engine (derived APIs) | ✅ Complete |
| 10E | Admin inventory calendar UI | ✅ Complete |
| 10F | Booking confirmation email & notifications | ✅ Complete |
| 10G | Admin create booking form | ✅ Complete |
| 10H | Admin inquiries CRUD UI | ✅ Complete |
| 10I | Persistent inventory dates (stop-sell/allotment/overbooking) | ✅ Complete |
| 11–14 | Booking polish, PMS, CRM, payments | ⬜ |
| 15 | Multi-Property SaaS | ⬜ |

Design principle: har hotel data-driven hai (slug-wise), koi bhi hotel doosre hotel ka content ya photos share nahi karta.

---

## 2. Current Tech Stack

| Layer | Technology | Port |
|-------|------------|------|
| Frontend | **Next.js** (React) | `3000` |
| Backend | **Node.js + Express** | `5001` |
| Database | **PostgreSQL** (`pg` driver) | `5432` |

- **Frontend location:** `frontend/`
- **Backend location:** `backend/`
- **Frontend → Backend base URL:** `NEXT_PUBLIC_API_URL` (default `http://localhost:5001`)

> Note: Purani docs mein backend port `5000` likha tha; **ab backend `5001`** par chalta hai (frontend isi ko default API base maanta hai). Neeche ke legacy sections mein jahan `5000` dikhe, use `5001` samjhein.

---

## 3. Current Status (Completed)

**Phases 1–9, 10A and 10B are complete.** Detail: [`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md).

- ✅ **Public website** — multi-hotel Next.js; Aurelia Grand + Zaarang Inn; slug detail pages.
- ✅ **Hotel-wise Photos folders** — gallery/room cards; empty categories skipped.
- ✅ **Backend REST + `/health`** — PostgreSQL-backed public and admin APIs.
- ✅ **Booking inquiry** — `InquiryForm` → `POST /api/inquiries`.
- ✅ **Admin Authentication (JWT)** — `/admin/login`, `admin_users`, `requireAdminAuth`.
- ✅ **Hotel Management** — `/admin/hotels` + `/api/admin/hotels`.
- ✅ **Room Type Management** — `/admin/room-types` + `/api/admin/room-types`.
- ✅ **Rooms Management** — `/admin/rooms` + `/api/admin/rooms`.
- ✅ **Hotel Media Management** — `/admin/media` + `/api/admin/media` (upload).
- ✅ **Production hardening** — SEO, Helmet/CORS/rate limits, a11y/performance baseline.
- ✅ **Premium hotel detail UX** — rooms, tariff UI, facilities, lightbox, map, sticky CTA.
- ✅ **Phase 8 — API-driven public site** — hotel pages load details, media, amenities,
  room types, contact, and policies from existing public APIs; loading/error states added.

- ✅ **Phase 9 — Tariff & rate management** — `tariff_rates` table, admin/public APIs,
  `/admin/tariffs`, public meal-plan matrix from API.

- ✅ **Phase 10A — Booking engine backend foundation** — `bookings` table
  (migration `004`), availability derived from `rooms` + live reservations with
  transaction/advisory-lock overbooking protection, public
  `POST /api/bookings` + contact-verified `GET /api/bookings/:bookingNumber`, and
  admin JWT `/api/admin/bookings` (list/filter/paginate, detail, create, update,
  status transitions, room assignment). Backend only — no booking UI yet.

- ✅ **Phase 10B — Guest booking UI** — `/book` five-step flow (Stay Details →
  Available Rooms → Guest Details → Review → Confirmation) with live stay
  summary, `GET /api/bookings/availability` for date-aware inventory, submit via
  `POST /api/bookings`, and `/booking/[bookingNumber]` contact-verified lookup.
  Hotel “Book Your Stay” / sticky Book Now deep-link with `?hotel=`; room cards
  with `?hotel=&room=`. Inquiry form unchanged. No schema change, no payment
  gateway. Quotes read “Price on request” until an admin sets room-type
  `base_price` (seeded values are `0`).

- ✅ **Phase 10C — Admin booking management (module)** — `/admin/bookings` list
  (search, hotel/status/date filters, pagination, sorting), detail with guest /
  stay / room / pricing / timeline / notes, status actions (confirm, cancel,
  check-in, check-out, no-show), room assignment, and dashboard stats via
  `GET /api/admin/bookings/stats`. List `sort`/`order` added without schema
  change. Public site and guest booking UI untouched. Remaining 10C items:
  availability calendar, allotment/stop-sells, confirmation email, dedicated
  internal-notes column, admin create form. Verified 2026-08-05
  (`verify:phase10c`); no_show stamps `cancelled_at` for audit.

- ✅ **Phase 10D — Availability & inventory engine** — `inventory.service.js`
  with per-day sold/remaining counts, stay-peak parity with booking availability,
  overlap detection, and calendar-ready APIs (`/api/admin/inventory/*`,
  `GET /api/bookings/availability/calendar`).

- ✅ **Phase 10I — Persistent inventory dates** — migration `005`
  `room_type_inventory_dates` (hotel-scoped sparse overrides). Booking and
  inventory services apply stop-sell / allotment / overbooking allowance;
  missing rows keep Phase 10D behaviour. Public request bodies unchanged.
  Smoke: `npm run verify:phase10i`. Admin edit UI for date rows still pending.

- ✅ **Phase 10E — Admin inventory calendar UI** — `/admin/inventory` monthly
  PMS calendar (hotel/room-type selectors, color-coded day cells) consuming
  `GET /api/admin/inventory/calendar`.

- ✅ **Phase 10F — Booking confirmation email & notifications** — provider
  abstraction (`services/email`: console + SMTP), branded HTML templates
  (confirmation / cancellation / status update), fire-and-forget hooks on
  booking create and admin status changes. No schema change. Verify:
  `npm run verify:phase10f`.

- ✅ **Phase 10G — Admin create booking form** — `/admin/bookings/new` with
  availability check, price summary, notes (`special_requests`), confirmation
  screen. Reuses `POST /api/admin/bookings`. No schema change.

- ✅ **Phase 10H — Admin inquiries CRUD UI** — `/admin/inquiries` list + detail
  (search, status, pagination, delete). JWT on inquiry list/get/status/delete;
  public create unchanged. No schema change.

**Next:** Admin UI to edit inventory date rows; booking internal notes column
(schema); Phase 11.

---

## 3b. Historical status bullets (preserved detail)

Ye pehle ke detailed completion notes hain (roadmap renumbering ke baad bhi valid):

- ✅ **Multi-hotel frontend working** — ek codebase se multiple hotels render hote hain.
- ✅ **Aurelia Grand aur Zaarang Inn dono working** — dono hotels live hain.
- ✅ **Hotel-wise image folders** — saare photos `frontend/public/Photos/<Hotel>/<Category>/` ke andar organized hain.
- ✅ **Hotel detail pages slug-wise load** hoti hain — route `/hotels/[slug]`.
- ✅ **Gallery images hotel-wise load** hoti hain — har hotel ki apni categories se (empty category skip ho jaati hai).
- ✅ **Room cards hotel-wise load** hote hain — har hotel ke `Rooms/` folder se.
- ✅ **Backend `/health` working** — server + database connection check.
- ✅ **Booking inquiry feature working** — reusable `InquiryForm` frontend component
  `POST /api/inquiries` par submit karta hai (backend endpoint + validation +
  `inquiries` table pehle se the, waise hi reuse kiye).
- ✅ **Production hardening done** — SEO (metadata, Open Graph, `robots.txt`,
  `sitemap.xml`, web manifest, canonical URLs, aur JSON-LD structured data),
  backend security (Helmet, tighter CORS, rate limiting, request-size limits),
  accessibility (ARIA live regions, focus rings, alt text), aur performance (lazy
  images, API request timeout). Booking inquiry form mein client-side validation +
  inline field errors bhi add kiye. Schema change nahi kiya, existing APIs + `/` +
  `/health` + localhost intact.
- ✅ **Premium hotel detail redesign (sirf frontend UX/UI)** — dono hotel pages
  ko luxury layout mein redesign kiya (brand palette/logo/header same). Rooms ab
  bade alternating cards hain (Room Name, Starting Price, Occupancy, Bed Type,
  Room Highlights, Amenities, **View Tariff** + **Book Now** buttons). `RoomTariff`
  ab professional meal-plan matrix hai (No Meal / Breakfast / Breakfast + One Meal /
  All Meals × Single / Double) + alag **Couple / Get Together Package** (**₹999 ·
  3 Hours, dono hotels par**, official food inclusions) with prominent "Book Couple
  Package" CTA + Extra Bed (₹400) / GST (5% Extra) / Check-in (12 PM) / Check-out
  (11 AM) policy strip. Facilities curated premium icon grid (`lib/facilities.js`),
  Gallery mein lightbox, Location map improve, sticky **Book Now** CTA, aur smooth
  scroll-reveal animations (`Reveal`). Zaarang official room + meal-plan rates use
  karta hai; Aurelia same structure but **"Contact for Tariff"** jab tak official
  rates nahi aate (koi fake pricing nahi). Section order: Hero →
  About → Rooms → Tariff → Facilities → Gallery → Location → Reviews → Contact.
  Data `frontend/src/lib/tariffs.js` se aata hai — koi API/DB/schema change nahi.
- ✅ **Tariff & Meal Plans section rework (dono hotels, shared source):** Tariff
  section se **₹999 Couple / Get Together Package card hata di** (price, duration,
  inclusions, "Book Couple Package" button) — ₹999 sirf Standard room card par
  rehta hai. Dono hotels ab ek hi **shared official meal-plan matrix**
  (`SHARED_MEAL_PLANS`) use karte hain: No Meal ₹1,799/₹2,199 · Breakfast
  (Single = "Available with room plan", Double ₹2,299) · Breakfast + One Meal
  ₹2,199/₹2,599 · All Meals Single ₹2,499 (Zaarang Double ₹3,199; Aurelia Double
  "Available with room plan" via `AURELIA_MEAL_PLANS`). Aurelia ab yahan "Contact
  for Tariff" nahi dikhata. Meal-plan cell ab price ki jagah text note bhi carry
  kar sakta hai (`singleNote`/`doubleNote`). Tariff section mein koi bhi room-card
  price (₹999/₹1,999/₹2,999) nahi dikhti; shared disclaimer add kiya; check-in/out
  sirf policy strip mein (duplicate nahi). Koi backend/API/DB/schema change nahi.
- ✅ **Aurelia targeted content:** Deluxe card highlights mein **Complimentary
  Breakfast** add kiya; Aurelia tariff matrix (`AURELIA_MEAL_PLANS`) mein All Meals /
  Double ab **"Available with room plan"** (₹3,199 sirf pehle SHARED matrix mein
  tha). Koi layout/component change nahi.
- ✅ **Zaarang Inn = Aurelia layout (shared components, Zaarang data):** Standard
  room card ab ₹999 Couple / Get Together Package (3 Hours, Queen, choose-one food)
  — Aurelia jaisa structure, Zaarang content/images. Deluxe ₹1,999 / Suite ₹2,999
  approved Zaarang details. `ZAARANG_MEAL_PLANS` official rates; tariff section mein
  Couple Package card nahi. Facilities labels `getHotelFacilities` se (Aurelia
  wording same). Koi backend/API/DB change nahi.
- ✅ **Aurelia room-card corrections (data-driven):** Deluxe aur Suite ab
  **Duration: 1 Day** dikhate hain. Suite occupancy **2 Adults + 2 Children**,
  bed type **King** (pehle "King + Sofa Bed" tha — ab naye `bedType` override se
  King; DB row waise ka waisa, koi schema/API change nahi), aur official
  **Food Plan: Complimentary Meals — 3 Times** section + note "Meal menu and items
  are selected daily by hotel management" (koi dish invent nahi ki). `FeaturedRooms`
  ab Room Size slot ko cleanly hata deta hai jab verified size nahi hoti (Aurelia
  par dash-only field nahi); Zaarang cards unchanged. Naye optional fields:
  `bedType`, structured `foodPlan` (`lib/tariffs.js`).

Slug mapping (source of truth):

| Hotel | Slug | Photo folder |
|-------|------|--------------|
| M2N Hotel : Aurelia Grand | `m2n-hotel-aurelia-grand` | `/Photos/Aurelia-Grand` |
| Hotel Zaarang Inn | `hotel-zaarang-inn` | `/Photos/Zaarang-Inn` |

---

## 4. Image Folder Structure

Har hotel ke photos apne dedicated folder mein rehte hain, category subfolders ke saath:

```
frontend/public/Photos/
├── Aurelia-Grand/
│   ├── Hero/
│   ├── Exterior/
│   ├── Lobby/
│   ├── Reception/
│   ├── Rooms/
│   ├── Bathroom/
│   └── Banquet/
│
└── Zaarang-Inn/
    ├── Hero/
    ├── Exterior/
    ├── Lobby/
    ├── Reception/
    ├── Rooms/
    ├── Bathroom/
    └── Banquet/
```

Category usage:

- **Hero/** → hotel hero (top banner) image.
- **Exterior/** → hotel card cover + gallery.
- **Lobby/**, **Reception/** → about/interior + gallery.
- **Rooms/** → room card covers + gallery.
- **Bathroom/**, **Banquet/** → gallery.

Files simple numbered hote hain (`1.jpg`, `2.jpg`, …) aur natural order mein load hote hain. Agar koi category **empty** ho (jaise Zaarang ka `Banquet/`), to wo gallery mein **safely skip** ho jaati hai.

---

## 5. Image Rule (IMPORTANT)

> **Kabhi bhi ek hotel ke photos doosre hotel mein mat mix karo.**

- Har hotel ke images **sirf** uske apne slug/folder mapping se aate hain (`slug → /Photos/<Hotel>`).
- Koi hardcoded cross-hotel image nahi (e.g. Aurelia ki photo Zaarang par kabhi nahi dikhni chahiye).
- Naya hotel add karte waqt: pehle uska folder `frontend/public/Photos/<Hotel-Name>/` banao, category subfolders + images daalo, phir slug → folder mapping register karo.
- Mapping single source of truth hai — display isi par depend karti hai, kisi flat/global image list par nahi.
- **Stock/demo images (Unsplash, placehold.co, picsum, dummyimage …) valid hotel media nahi hain.**
  `lib/media.js` inhe reject karta hai, chahe `hotel_media` row mein aise URL pade hon.
- Seed media hamesha hotel ke apne `/Photos/<Folder>/<Category>/<n>.jpg` files ko point kare.
  Path ka category segment hi hero / room card / gallery placement decide karta hai.
- Hotel known ho to fallback usi hotel ke folder ke andar hi rahega — dusre hotel ki photo
  fallback ke roop mein bhi kabhi nahi aayegi. Details: [ADR-0013](docs/history/DECISIONS.md).
- Hero ke liye sirf **ek** cover select hota hai; baaki active images `sort_order` ke hisaab se gallery mein jaati hain.
- **Homepage brand hero** `/brand-hero.jpg` (Git `336582d` se restore) — hospitality
  background photo behind “Stay Better, Grow Together”. Logo graphic hero nahi.
  Hotel photos `/hotels/[slug]` (aur homepage hotel cards) par. [ADR-0018](docs/history/DECISIONS.md).

---

## 6. Pending Tasks (Next Up)

Canonical tracker: [`TODO.md`](TODO.md) · Roadmap: [`docs/13_ROADMAP.md`](docs/13_ROADMAP.md)

- ✅ **Phase 10I** — persistent stop-sell / allotment / overbooking
  (`room_type_inventory_dates`).
- ⬜ Admin UI / CRUD for inventory date rows.
- ⬜ **Remaining Phase 10C** — dedicated booking internal-notes column (schema
  approval).
- ✅ Overnight `base_price` set for Deluxe (1999) / Suite (2999); Standard stays
  0 (couple package is not nightly).
- ⬜ Deployment docs ([`docs/12_DEPLOYMENT.md`](docs/12_DEPLOYMENT.md)).
- ⬜ Production contact details (replace placeholders).
- ⬜ Run `005_room_type_inventory_dates.sql` on non-local environments.
- ⬜ Phases **11–15** (rates → inventory → booking → PMS → CRM → payments → SaaS).

> Note: Gallery lightbox and admin login are **done** (Phases 1 and 3). Older
> pending bullets below this section in git history are obsolete.

---

## Appendix — Backend Reference (Legacy Detail)

> Neeche ke sections purana **backend-only** reference hain. Yahan port `5000` likha ho to use `5001` samjhein (dekho Section 2). Ye detail file/architecture reference ke liye rakhi gayi hai.

---

## A1. Poora Folder Structure

```
M2N_Hotels/                         ← Project root
│
├── PROJECT_DOCS.md                 ← Ye file (project ka reference guide)
│
└── backend/                        ← Saari backend code yahan hai
    ├── package.json                ← Dependencies + npm scripts
    ├── package-lock.json           ← Locked dependency versions (auto-generated)
    ├── server.js                   ← Main entry — Express server start hota hai yahan se
    ├── .env.example                ← Environment variables ka sample (copy karke .env banao)
    ├── .env                        ← Apni secret values (git mein NAHI jaati — tum khud banate ho)
    ├── .gitignore                  ← node_modules, .env wagairah git se ignore
    ├── config/
    │   └── db.js                   ← PostgreSQL connection pool + query helpers
    └── node_modules/               ← npm install se aati hain (git ignore)
```

**Kyun alag `backend/` folder?**  
Jab frontend (React/Vue) add hoga, wo root ya `frontend/` mein rahega. Backend alag rehne se deploy, testing, aur team collaboration easy hoti hai.

---

## A2. Backend Architecture (Kaise Kaam Karta Hai)

### 3.1 High-level flow

```
Client (Browser / Postman / Frontend)
        │
        ▼
   server.js  ─── Express app, port 5000
        │
        ├── Middleware: cors, JSON parser
        ├── Routes: / , /health
        └── Error handlers: 404, 500
        │
        ▼ (sirf /health par)
   config/db.js  ─── PostgreSQL Pool
        │
        ▼
   PostgreSQL Database (m2n_hotel)
```

### 3.2 Request ka safar (step-by-step)

1. **`server.js` start hota hai** — pehle `dotenv` `.env` file load karta hai.
2. **Express app** banता hai — `cors`, `express.json()`, `urlencoded` middleware lagte hain.
3. **Route match** hota hai (`/` ya `/health`).
4. **`/health`** par `testConnection()` call hota hai jo `config/db.js` se PostgreSQL se `SELECT NOW()` chalata hai.
5. **Response JSON** mein milta hai — success ya error ke saath proper HTTP status code.

### 3.3 Design decisions (yaad rakhne ke liye)

| Decision | Kyun |
|----------|------|
| `config/db.js` alag file | Database logic server se alag — baad mein routes/controllers clean rahenge |
| `pg.Pool` (single connection nahi) | Production mein multiple requests ek saath handle hoti hain; connections reuse hote hain |
| `.env` + `dotenv` | Password aur host code mein hardcode nahi — security best practice |
| Health endpoint | Deploy / monitoring ke liye DB alive hai ya nahi, turant pata chal jata hai |

---

## A3. Har File Ka Kaam (Detail)

### `backend/package.json`

- Project naam: `m2n-hotel-backend`
- **Scripts:**
  - `npm start` → `node server.js` (production / normal run)
  - `npm run dev` → `node --watch server.js` (file change par auto-restart)
- **Dependencies:**

| Package | Kaam |
|---------|------|
| `express` | HTTP server aur REST API routes |
| `pg` | PostgreSQL driver |
| `dotenv` | `.env` se environment variables load |
| `cors` | Frontend (dusre port/domain) se API call allow |

- **Node version:** `>= 18.0.0` ( `--watch` dev script ke liye useful)

---

### `backend/server.js`

**Main entry point** — `npm start` yahi file chalata hai.

**Kya karta hai:**

1. `require("dotenv").config()` — env load
2. Express + CORS setup
3. **Routes:**
   - `GET /` — API alive check (database check nahi)
   - `GET /health` — server + database dono check
4. **404 handler** — galat URL par JSON error
5. **500 handler** — unexpected server errors
6. `app.listen(PORT)` — default `5000`, ya `.env` ka `PORT`

---

### `backend/config/db.js`

**Database layer** — poora PostgreSQL connection yahan manage hota hai.

**Exports:**

| Export | Use |
|--------|-----|
| `pool` | Direct pool access (advanced cases) |
| `query(text, params)` | SQL run karne ke liye — baad ki routes isse use karenge |
| `testConnection()` | Ek test query + connection release — health check ke liye |

**Pool settings (`.env` se):**

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `DB_SSL` — cloud DB (e.g. Railway, Supabase) par `true` kar sakte ho
- `DB_POOL_MAX`, timeouts — performance tuning

**Error handling:** Pool par unexpected error aane par console log hota hai.

---

### `backend/.env.example`

Sample file — **copy karke `.env` banao**, phir apni real values likho.

`.env` git mein commit **mat** karo (`.gitignore` mein hai).

---

### `backend/.gitignore`

Git se ignore: `node_modules/`, `.env`, log files.

---

## A4. Environment Variables (`.env`)

`.env.example` se copy karo aur values set karo:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=m2n_hotel
DB_USER=postgres
DB_PASSWORD=apna_asli_password

DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
DB_POOL_MAX=20
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=5000
```

**Zaroori baatein:**

- PostgreSQL pehle install / run hona chahiye
- Database `m2n_hotel` create karo (agar nahi hai):

```sql
CREATE DATABASE m2n_hotel;
```

---

## A5. API Endpoints (Backend)

| Method | URL | Status | Response |
|--------|-----|--------|----------|
| `GET` | `/` | 200 | API running message + version |
| `GET` | `/health` | 200 | Server healthy + DB connected + `server_time` |
| `GET` | `/health` | 503 | DB connect fail — error message JSON mein |
| `*` | koi aur path | 404 | Route not found message |

### Sample responses

**`GET http://localhost:5000/`**

```json
{
  "success": true,
  "message": "M2N Hotel API is running",
  "version": "1.0.0"
}
```

**`GET http://localhost:5000/health`** (DB OK)

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-05-20T12:00:00.000Z",
  "database": {
    "connected": true,
    "serverTime": "2026-05-20T12:00:00.000Z"
  }
}
```

---

## A6. Server Kaise Chalaye (Step-by-Step)

### Pehli baar setup

```powershell
# 1. Backend folder mein jao
cd c:\Projects\AKJM2M\M2N_Hotel\backend

# 2. Dependencies install (sirf ek baar ya package.json change par)
npm install

# 3. .env file banao
copy .env.example .env

# 4. .env kholo aur DB_PASSWORD / DB_NAME apne hisaab se set karo
```

PostgreSQL mein database ensure karo, phir server start karo.

### Server start

```powershell
cd c:\Projects\AKJM2M\M2N_Hotel\backend
npm start
```

Console mein dikhega:

```
M2N Hotel server running on http://localhost:5000
```

### Development mode (auto-restart on file save)

```powershell
npm run dev
```

### Test karo

- Browser: `http://localhost:5000/`
- Health: `http://localhost:5000/health`
- Postman / curl bhi use kar sakte ho

---

## A7. Common Problems aur Fix

| Problem | Possible fix |
|---------|----------------|
| `ECONNREFUSED` on `/health` | PostgreSQL service start karo; `DB_HOST` / `DB_PORT` check karo |
| `password authentication failed` | `.env` mein `DB_USER` / `DB_PASSWORD` sahi karo |
| `database "m2n_hotel" does not exist` | PostgreSQL mein `CREATE DATABASE m2n_hotel;` |
| Port already in use | `.env` mein `PORT=5001` ya jo process 5000 use kar rahi ho band karo |
| `npm` command not found | Node.js install karo (v18+) |

---

## A8. Backend Extend Karne Ka Pattern (Suggested Structure)

Jab features badhenge, backend ko aise extend karna natural hai:

```
backend/
├── routes/           ← URL definitions (e.g. rooms, bookings)
├── controllers/      ← Business logic (public + admin* pairs)
├── services/         ← Multi-step domain logic (e.g. booking availability)
├── models/           ← DB queries / schemas
├── middleware/       ← Auth, validation
├── utils/            ← Helpers + domain constants
└── migrations/       ← SQL schema files
```

**Nayi route add karte waqt pattern:**

1. `routes/` mein router file (public aur admin ke liye alag, jaise
   `booking.routes.js` + `adminBooking.routes.js`)
2. `controllers/` mein logic
3. Agar logic transaction/locking maangta hai to `services/` mein rakho
   (reference: `services/booking.service.js`)
4. SQL ke liye `const { query } = require("../config/db")`; transaction ke liye
   `pool.connect()` + `BEGIN`/`COMMIT`
5. `routes/index.js` mein `router.use("/api/rooms", roomsRouter)` jaisa mount

---

## A9. Quick Reference (Ek Nazar Mein)

| Cheez | Value / Path |
|-------|----------------|
| Project root | `c:\Projects\AKJM2M\M2N_Hotels` |
| Frontend code | `frontend/` (Next.js, port `3000`) |
| Backend code | `backend/` (Express, port `5001`) |
| Backend start | `npm start` (inside `backend/`) |
| Frontend dev | `npm run dev` (inside `frontend/`) |
| Backend URL | `http://localhost:5001` |
| Frontend URL | `http://localhost:3000` |
| Photos root | `frontend/public/Photos/<Hotel>/<Category>/` |
| DB config file | `backend/config/db.js` |
| Env sample | `backend/.env.example` |

---

*Is document ko project ke saath update karte raho — jab bhi naya module (auth, rooms, bookings) add ho, yahan section add kar lena.*
