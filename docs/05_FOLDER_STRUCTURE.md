# 05 — Folder Structure

> **Status:** Living document · **Last updated:** 2026-09-03

---

## 1. Repository layout

```
M2N_Hotels/
├── README.md                 ← Project entry + docs index
├── AGENTS.md                 ← AI / contributor rules
├── PROJECT_DOCS.md           ← Legacy master index (preserved)
├── TODO.md                   ← Active tasks
├── docs/                     ← Structured documentation
│   ├── 00_PROJECT_OVERVIEW.md … 13_ROADMAP.md
│   ├── CHANGELOG.md
│   ├── history/              ← ADRs + release notes
│   └── aliases (API_DOCUMENTATION.md, etc.)
├── frontend/                 ← Next.js 16 (:3000)
└── backend/                  ← Express API (:5001)
```

## 2. Frontend

```
frontend/
├── public/Photos/{Aurelia-Grand,Zaarang-Inn}/…
└── src/
    ├── app/
    │   ├── page.js, about/, login/ (guest stub)
    │   ├── hotels/[slug]/
    │   ├── book/, booking/, booking/[bookingNumber]/
    │   └── admin/
    │       ├── login/, onboarding/          ← public admin surfaces
    │       └── (protected)/
    │           ├── dashboard/, front-desk/
    │           ├── bookings/ (+ new, [id] finance panels)
    │           ├── guests/, guests/profile/
    │           ├── inventory/, inquiries/
    │           ├── hotels/, room-types/, rooms/, media/, tariffs/
    │           └── billing/                 ← read-only Phase 15 stub
    ├── components/ (public + admin + booking/)
    └── lib/
        ├── api.js, adminAuth.js, brand.js, …
        ├── adminHotels.js, adminRoomTypes.js, adminRooms.js, adminMedia.js
        ├── adminTariffs.js, adminBookings.js, adminBookingFinance.js
        ├── adminInventory.js, adminInquiries.js, adminGuests.js
        └── adminTenant.js
```

## 3. Backend

```
backend/
├── server.js
├── config/db.js
├── routes/          ← index + public + admin* routers
├── controllers/
├── middleware/      ← auth, tenancy, validate, error, upload
├── services/        ← booking, inventory, crmGuest, payments, invoices, email
├── utils/           ← adminAuth, adminTenancy, bookingConstants, …
├── validators/
├── migrations/      ← 001 … 009 + README
├── scripts/         ← migrate, seed, seedAdmin, verify:*
└── uploads/         ← local admin media (not for multi-instance prod)
```

## 4. Docs map

See [`../README.md`](../README.md) documentation table and
[`../PROJECT_DOCS.md`](../PROJECT_DOCS.md).
