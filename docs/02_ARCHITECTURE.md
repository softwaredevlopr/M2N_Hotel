# 02 — Architecture

> **Status:** Living document · **Last updated:** 2026-07-14  
> **Related:** [04 — API](04_API.md) · [03 — Database](03_DATABASE.md) · [`../PROJECT_DOCS.md`](../PROJECT_DOCS.md)

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Tech Stack](#2-tech-stack)
- [3. High-Level Diagram](#3-high-level-diagram)
- [4. Frontend](#4-frontend)
- [5. Backend](#5-backend)
- [6. Data Flow](#6-data-flow)
- [7. Admin Architecture](#7-admin-architecture)
- [8. Key Design Decisions](#8-key-design-decisions)
- [9. Open Questions](#9-open-questions)

---

## 1. Overview

Two-tier application: **Next.js** frontend and **Express** API on **PostgreSQL**.
Public pages are largely static/filesystem-driven today; admin is API-driven.
**Phase 8** ✅ — public hotel pages consume existing read APIs (details, media, amenities, room types).

## 2. Tech Stack

| Layer | Technology | Port |
|-------|------------|------|
| Frontend | Next.js (React, App Router) | `3000` |
| Backend | Node.js + Express | `5001` |
| Database | PostgreSQL (`pg` pool) | `5432` |
| Auth (admin) | JWT (`jsonwebtoken`) + bcryptjs | — |
| Uploads | Multer → `backend/uploads` served at `/uploads` | — |

Frontend API base: `NEXT_PUBLIC_API_URL` (fallback `http://localhost:5001`).

## 3. High-Level Diagram

```
┌─────────────┐     HTTPS/JSON      ┌──────────────────┐
│   Browser   │ ◄─────────────────► │ Next.js (:3000)  │
│  (guest /   │                     │  Public pages    │
│   admin)    │                     │  /admin/* UI     │
└─────────────┘                     └────────┬─────────┘
                                             │ NEXT_PUBLIC_API_URL
                                             ▼
                                    ┌──────────────────┐
                                    │ Express (:5001)  │
                                    │ /api/*  /health  │
                                    │ /uploads/*       │
                                    └────────┬─────────┘
                                             │
                                             ▼
                                    ┌──────────────────┐
                                    │ PostgreSQL       │
                                    │ (:5432)          │
                                    └──────────────────┘
```

### Public vs admin surfaces

```
Public (no JWT)                    Admin (Bearer JWT)
─────────────────                  ──────────────────
GET  /api/hotels                   /api/admin/auth/*
GET  /api/hotels/:slug             /api/admin/hotels
GET  /api/rooms/types              /api/admin/room-types
GET  /api/rooms                    /api/admin/rooms
POST /api/inquiries                /api/admin/media
Photos under frontend/public       uploads under backend/uploads
```

## 4. Frontend

- Location: `frontend/`
- Public routes: `/`, `/about`, `/book`, `/hotels/[slug]`, …
- Admin routes: `/admin/login`, `/admin/dashboard`, `/admin/hotels`,
  `/admin/room-types`, `/admin/rooms`, `/admin/media`, …
- Hotel imagery (public): slug → `public/Photos/<Hotel>/…` via `lib/images.js`
- Tariff display: `GET /api/tariffs` + `lib/tariffs.js` fallback for room-card packages
- Admin helpers: `lib/adminAuth.js`, `adminHotels.js`, `adminRoomTypes.js`,
  `adminRooms.js`, `adminMedia.js`

## 5. Backend

- Entry: `backend/server.js` (Helmet, CORS, rate limits, static `/uploads`)
- Routing: `backend/routes/` → controllers → `config/db.js`
- Middleware: `validate`, `requireAdminAuth`, `error.middleware`
- Responses: `utils/apiResponse` (`success` / validation errors)
- Services: `backend/services/` holds multi-step domain logic that needs a
  transaction or locking, so controllers stay request-shaped. First use:
  `booking.service.js` (Phase 10A availability + reservation writes).

Public and admin surfaces are split into sibling files per module
(`booking.routes.js` / `adminBooking.routes.js`), which keeps JWT enforcement at
the router level.

Suggested growth pattern (as modules expand): routes → controllers → services →
models.

## 6. Data Flow

**Hotel detail page (today)**

1. Next.js loads `/hotels/[slug]`.
2. Fetches `GET /api/hotels/:slug` (hotel + active media + amenities).
3. Resolves gallery/room images primarily from `Photos/` folders.
4. Renders tariff/facilities from frontend libs; inquiry posts to API.

**Admin mutation**

1. Admin logs in → JWT stored in localStorage.
2. UI calls `/api/admin/...` with `Authorization: Bearer …`.
3. Controller validates → SQL via pool → JSON response → toast UI.

## 7. Admin Architecture

| Module | UI | API |
|--------|----|-----|
| Auth | `/admin/login` | `/api/admin/auth` |
| Hotels | `/admin/hotels` | `/api/admin/hotels` |
| Room types | `/admin/room-types` | `/api/admin/room-types` |
| Rooms | `/admin/rooms` | `/api/admin/rooms` |
| Media | `/admin/media` | `/api/admin/media` |

Protected by `AdminGuard` (client) + `requireAdminAuth` (server).

## 8. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate `frontend/` / `backend/` | Independent deploy & scaling |
| Slug-based hotel routing | Clean URLs + photo folder mapping |
| Admin JWT Bearer | Simple SPA admin auth |
| No casual schema changes | Stability; encode extras in JSONB/URL where needed |
| Public APIs unchanged when adding admin | Avoid breaking the live site |

See [`history/DECISIONS.md`](history/DECISIONS.md).

## 9. Open Questions

- [x] Caching / ISR strategy for hotel pages (`revalidate: 60` on public routes).
- [ ] CDN / object storage for uploads in production.
- [ ] Staging vs production topology.
