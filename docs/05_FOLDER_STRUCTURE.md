# 05 — Folder Structure

> **Status:** Living document · **Last updated:** 2026-07-14

---

## 1. Repository layout

```
M2N_Hotels/
├── README.md                 ← Project entry
├── AGENTS.md                 ← AI / contributor rules
├── PROJECT_DOCS.md           ← Legacy master index (preserved)
├── TODO.md                   ← Active tasks
├── docs/                     ← Structured documentation
│   ├── 00_PROJECT_OVERVIEW.md … 13_ROADMAP.md
│   ├── CHANGELOG.md
│   ├── history/              ← ADRs + release notes
│   └── *.md aliases          ← ROADMAP, ARCHITECTURE, etc.
├── frontend/                 ← Next.js (:3000)
└── backend/                  ← Express API (:5001)
```

## 2. Frontend

```
frontend/
├── public/
│   └── Photos/
│       ├── Aurelia-Grand/{Hero,Exterior,Lobby,Reception,Rooms,Bathroom,Banquet}/
│       └── Zaarang-Inn/{…}/
└── src/
    ├── app/
    │   ├── page.js, about/, hotels/[slug]/
    │   ├── book/                    ← Guest booking flow (Phase 10B)
    │   ├── booking/                 ← Find reservation (reference + contact)
    │   ├── booking/[bookingNumber]/ ← Confirmation + guest lookup (noindex)
    │   └── admin/
    │       ├── login/
    │       └── (protected)/
    │           ├── dashboard/
    │           ├── bookings/
    │           │   ├── [id]/
    │           │   └── new/              ← Phase 10G create form
    │           ├── inventory/        ← Phase 10E calendar UI
    │           ├── inquiries/        ← Phase 10H list + [id]
    │           ├── hotels/
    │           ├── room-types/
    │           ├── rooms/
    │           ├── media/
    │           └── tariffs/
    ├── components/           ← Public + admin UI
    │   ├── booking/          ← BookingFlow + step / summary / confirmation
    │   └── admin/            ← AdminGuard, BookingCreateForm, InventoryCalendarGrid, forms, Toast, …
    └── lib/
        ├── api.js, images.js, media.js, tariffs.js, brand.js, …
        ├── bookingPricing.js, bookingSession.js
        ├── adminAuth.js
        ├── adminHotels.js, adminRoomTypes.js, adminRooms.js, adminMedia.js,
        │   adminTariffs.js, adminBookings.js, adminInventory.js, adminInquiries.js

## 3. Backend

```
backend/
├── server.js                 ← Helmet, CORS, rate limits, /uploads static
├── config/db.js
├── routes/
│   ├── index.js              ← mounts public + admin routers
│   ├── hotel.routes.js, room.routes.js, inquiry.routes.js
│   ├── adminAuth.routes.js, adminHotel.routes.js
│   ├── adminRoomType.routes.js, adminRoom.routes.js, adminMedia.routes.js
│   ├── tariff.routes.js, adminTariff.routes.js
│   ├── booking.routes.js, adminBooking.routes.js
├── controllers/
├── services/                 ← booking, inventory, email, bookingNotification
│   └── email/                ← provider abstraction + HTML templates (Phase 10F)
├── middleware/               ← validate, adminAuth, error
├── validators/
├── utils/                    ← apiResponse, mediaCategory, booking* …
├── uploads/                  ← admin media files (gitignored contents)
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_admin_users.sql
│   ├── 003_tariff_rates.sql
│   ├── 004_bookings.sql
│   ├── 005_room_type_inventory_dates.sql
│   └── 006_booking_admin_notes.sql
└── scripts/
    ├── seed.js, seedAdmin.js, runMigrations.js
```

## 4. Hotel image folders (public)

Categories per hotel: `Hero`, `Exterior`, `Lobby`, `Reception`, `Rooms`,
`Bathroom`, `Banquet`.

**Rule:** Never mix photos between hotels — slug → folder mapping only.
See [09 — Business Rules](09_BUSINESS_RULES.md).

Admin uploads live separately under `backend/uploads/hotels/{hotelId}/{Category}/`.
