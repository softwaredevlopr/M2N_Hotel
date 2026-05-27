# M2N Hotel — Project Documentation

> **Last updated:** May 2026  
> **Purpose:** Is file mein ab tak ka backend setup, architecture, aur server chalane ka tareeka likha hai — taaki aage kaam karte waqt context yaad rahe.

---

## 1. Project Overview

**M2N_Hotel** ek hotel management project hai. Abhi tak sirf **backend API** setup hua hai:

- **Tech stack:** Node.js + Express.js + PostgreSQL
- **Backend location:** `backend/` folder (project root ke andar alag folder — production-ready pattern)
- **Default port:** `5000`
- **Database:** PostgreSQL (`pg` package se connection)

Frontend ya database tables abhi add nahi kiye gaye — ye documentation sirf **current backend base** ko cover karti hai.

---

## 2. Poora Folder Structure

```
M2N_Hotel/                          ← Project root
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

## 3. Backend Architecture (Kaise Kaam Karta Hai)

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

## 4. Har File Ka Kaam (Detail)

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

## 5. Environment Variables (`.env`)

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

## 6. API Endpoints (Abhi Available)

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

## 7. Server Kaise Chalaye (Step-by-Step)

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

## 8. Common Problems aur Fix

| Problem | Possible fix |
|---------|----------------|
| `ECONNREFUSED` on `/health` | PostgreSQL service start karo; `DB_HOST` / `DB_PORT` check karo |
| `password authentication failed` | `.env` mein `DB_USER` / `DB_PASSWORD` sahi karo |
| `database "m2n_hotel" does not exist` | PostgreSQL mein `CREATE DATABASE m2n_hotel;` |
| Port already in use | `.env` mein `PORT=5001` ya jo process 5000 use kar rahi ho band karo |
| `npm` command not found | Node.js install karo (v18+) |

---

## 9. Aage Kya Add Hoga (Suggested Structure)

Jab features badhenge, backend ko aise extend karna natural hai:

```
backend/
├── routes/           ← URL definitions (e.g. rooms, bookings)
├── controllers/      ← Business logic
├── models/           ← DB queries / schemas
├── middleware/       ← Auth, validation
├── utils/            ← Helpers
└── migrations/       ← SQL schema files
```

**Nayi route add karte waqt pattern:**

1. `routes/` mein router file
2. `controllers/` mein logic
3. SQL ke liye `const { query } = require("../config/db")`
4. `server.js` mein `app.use("/api/rooms", roomsRouter)` jaisa mount

---

## 10. Quick Reference (Ek Nazar Mein)

| Cheez | Value / Path |
|-------|----------------|
| Project root | `c:\Projects\AKJM2M\M2N_Hotel` |
| Backend code | `backend/` |
| Start command | `npm start` (inside `backend/`) |
| Dev command | `npm run dev` |
| Default URL | `http://localhost:5000` |
| DB config file | `backend/config/db.js` |
| Env sample | `backend/.env.example` |

---

*Is document ko project ke saath update karte raho — jab bhi naya module (auth, rooms, bookings) add ho, yahan section add kar lena.*
