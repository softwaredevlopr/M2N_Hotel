# 00 — Project Overview

> **Status:** Living document · **Last updated:** 2026-09-03  
> **Related:** [01 — Status](01_PROJECT_STATUS.md) · [13 — Roadmap](13_ROADMAP.md) · [`../README.md`](../README.md)

---

## 1. Summary

**M2N Hotels** is a multi-property hotel platform: Next.js public website + guest
booking UI, Express REST API, PostgreSQL, and a JWT admin console (ops, CRM Lite,
finance ledger, inventory, Phase 15 Lite tenancy).

**Live hotel brands (seed / public slugs)**

| Hotel | Slug | Photo folder |
|-------|------|--------------|
| M2N Hotel : Aurelia Grand | `m2n-hotel-aurelia-grand` | `/Photos/Aurelia-Grand` |
| Hotel Zaarang Inn | `hotel-zaarang-inn` | `/Photos/Zaarang-Inn` |

## 2. Vision

1. **Phases 1–15 Lite (done in code)** — Public multi-hotel site, inquiries,
   admin CRUD, API-driven pages, rates, inventory, booking engine, PMS Lite Front
   Desk, CRM Lite, Phase 14 manual payments/invoices, Phase 15 tenant isolation +
   onboarding + read-only billing stub.
2. **Staging → production cutover** — operator-run; staging seed is the next
   operational step when hotels API is empty.
3. **Later SaaS** — live payment gateway / subscription management, Full CRM,
   ERP/HRMS/OTA/AI only if separately approved.

## 3. Goals

- Data-driven, slug-scoped properties; never mix hotel photos.
- Safe multi-tenant operator boundary without rewriting `hotel_id` child tables.
- Document reality, not intention ([01 — Status](01_PROJECT_STATUS.md)).

## 4. Scope (current)

**In scope / shipped:** see status matrix in [01 — Status](01_PROJECT_STATUS.md).

**Out of Lite scope:** Stripe/Razorpay checkout, per-hotel ACL, guest user
accounts, reviews API, SMS/WhatsApp delivery, ERP/HRMS/OTA/AI.

## 5. Related documents

| Doc | Purpose |
|-----|---------|
| [01 — Status](01_PROJECT_STATUS.md) | What is done / next |
| [02 — Architecture](02_ARCHITECTURE.md) | System design |
| [03 — Database](03_DATABASE.md) | Schema through `009` |
| [04 — API](04_API.md) | Route inventory |
| [06 — Setup](06_SETUP_GUIDE.md) | Local setup |
| [11 — Security](11_SECURITY.md) | Security + debt |
| [12 — Deployment](12_DEPLOYMENT.md) | Staging/production runbook |
| [13 — Roadmap](13_ROADMAP.md) | Phases + backlog |
