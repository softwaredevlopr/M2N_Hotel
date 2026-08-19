# 00 — Project Overview

> **Status:** Living document · **Last updated:** 2026-08-19  
> **Related:** [`../PROJECT_DOCS.md`](../PROJECT_DOCS.md) · [01 — Status](01_PROJECT_STATUS.md) · [13 — Roadmap](13_ROADMAP.md)

---

## Table of Contents

- [1. Summary](#1-summary)
- [2. Vision](#2-vision)
- [3. Goals](#3-goals)
- [4. Scope](#4-scope)
- [5. Stakeholders](#5-stakeholders)
- [6. Glossary](#6-glossary)
- [7. Related Documents](#7-related-documents)

---

## 1. Summary

**M2N Hotels** is a multi-property hotel platform: a Next.js public website, an
Express REST API, PostgreSQL persistence, and a JWT-protected admin console for
hotels, room types, rooms, and media.

**Live hotels**

| Hotel | Slug | Photo folder |
|-------|------|--------------|
| M2N Hotel : Aurelia Grand | `m2n-hotel-aurelia-grand` | `/Photos/Aurelia-Grand` |
| Hotel Zaarang Inn | `hotel-zaarang-inn` | `/Photos/Zaarang-Inn` |

---

## 2. Vision

1. **Phases 1–14 Lite backend (done)** — Public multi-hotel site, booking
   inquiries, admin CRUD, API-driven pages, rates, inventory, booking engine,
   PMS Lite Front Desk, CRM Lite derived guest 360, and Phase 14 Lite
   payment/invoice APIs (no finance UI, no gateway).
2. **Remaining Phase 14 UI / Phase 15 (upcoming)** — admin Payments & Invoices
   UI, then multi-property SaaS. Full CRM / dated follow-ups only if approved.
3. **Phase 15 (goal)** — Multi-tenant SaaS with self-serve onboarding.

Everything is **data-driven and slug-scoped**. Hotels never share each other’s
photos or content.

---

## 3. Goals

- Operate multiple properties from one codebase.
- Let operators manage hotels, room types, rooms, and media in admin.
- Accept guest booking inquiries reliably and securely.
- Evolve toward API-driven public pages (Phase 8) and SaaS (Phase 15).

---

## 4. Scope

**In scope (current)**

- Public marketing / hotel detail experiences.
- Inquiry submission.
- Admin auth + CRUD for hotels, room types, rooms, media, tariffs, bookings,
  inventory, inquiries, Front Desk, and derived guests.
- PostgreSQL-backed REST API and booking engine (no payment gateway).

**Out of scope (until later phases)**

- Housekeeping workflow, folio, payment capture, guest master / Full CRM,
  multi-tenant SaaS billing.
- Changing DB schema without explicit approval.

---

## 5. Stakeholders

| Role | Responsibility |
|------|----------------|
| Product Owner | Priorities, content/tariff approval, launch readiness |
| Engineering | Frontend, backend, database, admin modules |
| Operations | Hotel data accuracy, media uploads, inquiry follow-up |

---

## 6. Glossary

| Term | Definition |
|------|------------|
| Hotel slug | URL-safe hotel id (e.g. `hotel-zaarang-inn`) |
| Room type | Category of room (Deluxe, Suite) — `room_types` |
| Room | Physical inventory unit — `rooms` |
| Cover / featured media | `hotel_media.is_cover` |
| Admin JWT | Bearer token from `POST /api/admin/auth/login` |

---

## 7. Related Documents

- [01 — Project Status](01_PROJECT_STATUS.md)
- [02 — Architecture](02_ARCHITECTURE.md)
- [04 — API](04_API.md)
- [13 — Roadmap](13_ROADMAP.md)
- Legacy: [`../PROJECT_DOCS.md`](../PROJECT_DOCS.md)
- Root: [`../README.md`](../README.md)
