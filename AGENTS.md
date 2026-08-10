# AGENTS.md — M2N Hotels AI Operating Manual

> **Purpose:** This is the permanent operating manual for any AI assistant
> (Cursor, ChatGPT, Claude, Gemini, Copilot, Codex, etc.) working on the
> **M2N Hotels** project.
>
> **Golden rule:** Any AI must be able to safely continue this project by reading
> only these three sources:
>
> 1. [`AGENTS.md`](AGENTS.md) — this file (rules & workflow)
> 2. [`PROJECT_DOCS.md`](PROJECT_DOCS.md) — legacy/detailed reference
> 3. [`docs/`](docs/) — structured documentation set
>
> If something is not covered by these, do **not** invent it — ask or add a
> `TODO` placeholder.

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Vision](#2-vision)
- [3. Tech Stack](#3-tech-stack)
- [4. Folder Structure](#4-folder-structure)
- [5. Backend Conventions](#5-backend-conventions)
- [6. Frontend Conventions](#6-frontend-conventions)
- [7. Database Rules](#7-database-rules)
- [8. Image Folder Rules](#8-image-folder-rules)
- [9. Coding Standards](#9-coding-standards)
- [10. Documentation Policy](#10-documentation-policy)
  - [10.1 Documentation Maintenance Policy (MANDATORY)](#101-documentation-maintenance-policy-mandatory)
- [11. Git Commit Policy](#11-git-commit-policy)
- [12. Cursor Agent Workflow](#12-cursor-agent-workflow)
- [13. Task Completion Checklist](#13-task-completion-checklist)
- [14. Never Change Without Approval](#14-never-change-without-approval)
- [15. AI Working Rules](#15-ai-working-rules)
- [16. Security Rules](#16-security-rules)
- [17. Performance Rules](#17-performance-rules)
- [18. Reference Index](#18-reference-index)

---

## 1. Project Overview

**M2N Hotels** is a hotel web platform built as a single codebase that serves
**multiple hotels**. Each hotel has its own slug, detail page, photos, and rooms.

Currently live hotels:

| Hotel | Slug | Photo folder |
|-------|------|--------------|
| M2N Hotel : Aurelia Grand | `m2n-hotel-aurelia-grand` | `/Photos/Aurelia-Grand` |
| Hotel Zaarang Inn | `hotel-zaarang-inn` | `/Photos/Zaarang-Inn` |

For full context, read [`docs/00_PROJECT_OVERVIEW.md`](docs/00_PROJECT_OVERVIEW.md)
and [`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md).

## 2. Vision

The direction is: **multi-property platform → dynamic public site → multi-tenant SaaS**.

**Completed (Phases 1–9):** public multi-hotel website, booking inquiries, JWT admin
console (hotels / room types / rooms / media / tariffs), API-driven public hotel pages.

**Completed (Phase 10A):** booking engine backend — `bookings` table, availability
engine with overbooking protection, public + admin booking APIs.

**Completed (Phase 10B):** guest booking UI — `/book` five-step flow (stay
details → available rooms via `GET /api/bookings/availability` → guest → review
→ confirmation) with a live stay summary, plus the `/booking/[bookingNumber]`
contact-verified lookup page. No payment gateway.

**Completed (Phase 10C module, verified 2026-08-05):** admin bookings console —
`/admin/bookings` list/detail with search, filters, pagination, sorting, status
actions, room assignment, and dashboard stats. `no_show` stamps `cancelled_at`
for audit. Verify with `npm run verify:phase10c` in `backend/`.

**Completed (Phase 10D):** derived availability & inventory engine —
`inventory.service.js`, admin `/api/admin/inventory/*`, public
`/api/bookings/availability/calendar`. Verify with `npm run verify:phase10d`.

**Completed (Phase 10I):** persistent inventory dates — migration `005`
`room_type_inventory_dates` (stop-sell / allotment / overbooking allowance).
Booking + inventory services apply sparse overrides; public request bodies
unchanged. Verify with `npm run verify:phase10i`.

**Completed (Phase 10E):** admin inventory calendar UI at `/admin/inventory`
(monthly grid, hotel/room-type filters, color-coded availability) over Phase
10D/10I APIs.

**Completed (Phase 10F):** booking confirmation / cancellation / status-update
emails via provider abstraction (`console` when SMTP unset, nodemailer SMTP when
configured). Fire-and-forget; never blocks booking APIs. Verify:
`npm run verify:phase10f`.

**Completed (Phase 10G):** admin create booking form at `/admin/bookings/new`
(availability check, price summary, confirmation screen) over existing admin
create API. No schema change.

**Completed (Phase 10H):** admin inquiries CRUD at `/admin/inquiries` (list,
detail, status, delete). Public `POST /api/inquiries` unchanged; admin reads/
writes require JWT. No schema change.

**Upcoming:** admin UI to edit inventory date rows, booking internal notes
(schema), Phase 11+. See [`docs/13_ROADMAP.md`](docs/13_ROADMAP.md).

Design principle: everything is **data-driven and slug-scoped**. No hotel shares
another hotel's content or photos.

## 3. Tech Stack

| Layer | Technology | Port |
|-------|------------|------|
| Frontend | Next.js (React) | `3000` |
| Backend | Node.js + Express | `5001` |
| Database | PostgreSQL | `5432` |

- Frontend → Backend base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:5001`).

See [`docs/02_ARCHITECTURE.md`](docs/02_ARCHITECTURE.md).

## 4. Folder Structure

```
M2N_Hotels/
├── README.md            ← Project entry
├── AGENTS.md            ← This operating manual
├── PROJECT_DOCS.md      ← Legacy/detailed reference (do not delete)
├── TODO.md              ← Active tasks
├── docs/                ← Structured documentation set
├── frontend/            ← Next.js app (port 3000)
│   ├── public/Photos/   ← Hotel-wise image folders (public site)
│   └── src/
│       ├── app/         ← Routes (incl. /hotels/[slug], /admin/*)
│       ├── components/  ← UI components (incl. admin/)
│       └── lib/         ← Shared helpers + admin API clients
└── backend/             ← Express API (port 5001)
    ├── server.js
    ├── config/db.js     ← PostgreSQL pool + query helpers
    ├── routes/          ← Public + /api/admin/* routers
    ├── uploads/         ← Admin media uploads
    ├── migrations/
    └── scripts/seed.js
```

Full detail: [`docs/05_FOLDER_STRUCTURE.md`](docs/05_FOLDER_STRUCTURE.md).

## 5. Backend Conventions

- Location: `backend/`. Entry point: `server.js`. Runs on port `5001`.
- All database access goes through the shared pool/query helpers in
  `backend/config/db.js` — do not create ad-hoc connections.
- Keep secrets in `.env` (never commit). Use `backend/.env.example` as the template.
- `/health` must remain a working server + database health check.
- Security middleware is wired in `server.js`: `helmet`, CORS allow-list, JSON/urlencoded
  body-size limits (100kb), and rate limiting (general `/api` + stricter
  `POST /api/inquiries`). Do not remove these; adjust limits deliberately.
- In production set `NODE_ENV=production` (enables `trust proxy` and hides error
  stack traces via `error.middleware.js`).
- As the API grows, follow a routes → controllers → models layering (see
  [`PROJECT_DOCS.md`](PROJECT_DOCS.md) appendix for the suggested pattern).

## 6. Frontend Conventions

- Location: `frontend/`. Framework: Next.js (App Router). Runs on port `3000`.
- Hotel detail pages are slug-based: `/hotels/[slug]`.
- **Images resolve via the slug → folder mapping only.** Never hardcode a specific
  hotel's images anywhere. See [Image Folder Rules](#8-image-folder-rules).
- Preserve the existing UI/design when making functional changes unless a design
  change is explicitly requested. See [`docs/10_UI_GUIDELINES.md`](docs/10_UI_GUIDELINES.md).
- If a data category/section is empty (e.g. no images in a category), skip it
  safely instead of rendering broken/empty UI.

## 7. Database Rules

- Database: PostgreSQL.
- **Do not change the database schema without explicit approval.**
- Do not delete data destructively; prefer non-destructive updates
  (e.g. status flags) where the existing code does so.
- Document any schema-relevant knowledge in [`docs/03_DATABASE.md`](docs/03_DATABASE.md);
  do not invent column definitions — confirm from the schema source first.

## 8. Image Folder Rules

**This is a hard rule.**

- Every hotel's imagery comes **only** from its own folder via the slug → folder
  mapping (`slug → /Photos/<Hotel>`).
- **Never mix photos between hotels** (e.g. Aurelia's photos must never appear for
  Zaarang).
- Category subfolders per hotel: `Hero`, `Exterior`, `Lobby`, `Reception`,
  `Rooms`, `Bathroom`, `Banquet`.
- Usage: Hero → hotel detail hero banner; Rooms → room cards; the rest feed the gallery.
- **Homepage brand hero** uses `/brand-hero.jpg` only (restored from Git
  `336582d`) — never hotel folder images and never the logo mark as the hero photo.
- If a category folder is empty, it is skipped safely.
- Adding a new hotel:
  1. Create `frontend/public/Photos/<Hotel-Name>/` with category subfolders + images.
  2. Register the slug → folder mapping.
  3. Never borrow another hotel's images as a placeholder.

See [`docs/09_BUSINESS_RULES.md`](docs/09_BUSINESS_RULES.md).

## 9. Coding Standards

- Keep changes **minimal and scoped** to the request.
- Match existing code style, naming, and patterns in the file/module you edit.
- Do not add narrating comments; comment only non-obvious intent.
- Fix linter errors you introduce.
- Do not invent project details — use `TODO` placeholders for unknowns.

Details: [`docs/07_CODING_RULES.md`](docs/07_CODING_RULES.md).

## 10. Documentation Policy

- The canonical documentation lives in [`docs/`](docs/); [`PROJECT_DOCS.md`](PROJECT_DOCS.md)
  is preserved as a legacy/detailed reference and must not be deleted or overwritten.
- When behavior or structure changes, update the relevant `docs/` file **and**
  [`docs/CHANGELOG.md`](docs/CHANGELOG.md).
- Keep this `AGENTS.md` authoritative for rules/workflow. If a rule changes, update
  it here.
- Any AI must be able to continue the project using only `AGENTS.md`,
  `PROJECT_DOCS.md`, and `docs/`. Keep these self-sufficient.

### 10.1 Documentation Maintenance Policy (MANDATORY)

This policy is **mandatory** and non-negotiable. Documentation is part of the
definition of done — code changes without matching documentation updates are
**incomplete**.

1. **Every completed task must update:**
   - [`PROJECT_DOCS.md`](PROJECT_DOCS.md)
   - [`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md)
   - [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
   - Any other affected documentation file(s).

2. **Every architectural decision must be recorded in:**
   [`docs/history/DECISIONS.md`](docs/history/DECISIONS.md) (as a new ADR).

3. **Every completed feature must be added to:**
   [`docs/history/RELEASE_NOTES.md`](docs/history/RELEASE_NOTES.md).

4. **Every unfinished feature must be listed in:**
   [`TODO.md`](TODO.md) (project root).

5. **Never consider a task complete until BOTH code and documentation are updated.**

6. **Before starting any task, read:**
   - [`PROJECT_DOCS.md`](PROJECT_DOCS.md)
   - [`AGENTS.md`](AGENTS.md) (this file)
   - [`TODO.md`](TODO.md)
   - The relevant files in [`docs/`](docs/)

## 11. Git Commit Policy

**Standing instruction (2026-08-03):** a task is not complete until its changes are
committed. After documentation is updated, run `git status`, then `git add .`,
commit, and `git push origin main`.

- Never modify git config, never force-push to `main`/`master`, never skip hooks
  unless explicitly requested.
- Do not commit secrets (`.env`, credentials) or build output. Read `git status`
  before staging — `git add .` is only safe while the tree holds nothing but the
  intended work.
- Write clear, concise commit messages that focus on the "why".
- PowerShell has no heredoc: pass multi-line messages with `git commit -F <file>`
  and delete the file afterwards.

## 12. Cursor Agent Workflow

1. **Understand** — Read the relevant parts of `AGENTS.md`, `PROJECT_DOCS.md`, and
   `docs/`, then inspect the actual code before editing.
2. **Plan** — For multi-step work, keep a task list and work one step at a time.
3. **Implement** — Make minimal, targeted edits. Use the correct specialized tools.
4. **Verify** — Check for linter errors; build/run when a change could affect behavior.
5. **Document** — Update `docs/` + `CHANGELOG.md` when behavior/structure changes.
6. **Commit** — Review `git status`, then commit and push ([§11](#11-git-commit-policy)).
7. **Report** — Summarize what changed, why, and any follow-ups.

## 13. Task Completion Checklist

Before declaring a task done, confirm:

- [ ] The request is fully addressed (all sub-tasks complete).
- [ ] No unrelated files or behavior were changed.
- [ ] Image rule respected (no cross-hotel photos; slug/folder mapping used).
- [ ] Database schema unchanged (unless explicitly approved).
- [ ] No secrets added or committed.
- [ ] Linter passes for edited files; build passes if behavior could change.
- [ ] Existing routes/UI still work and design is preserved (unless change requested).
- [ ] **Documentation Maintenance Policy** ([§10.1](#101-documentation-maintenance-policy-mandatory)) satisfied:
  - [ ] `PROJECT_DOCS.md` updated.
  - [ ] `docs/01_PROJECT_STATUS.md` updated.
  - [ ] `docs/CHANGELOG.md` updated.
  - [ ] Any other affected `docs/` file(s) updated.
  - [ ] Architectural decisions recorded in `docs/history/DECISIONS.md`.
  - [ ] Completed features added to `docs/history/RELEASE_NOTES.md`.
  - [ ] Unfinished features listed in `TODO.md`.
  - [ ] `README.md` updated when the phase table, routes or quick start change.
- [ ] Every changelog entry states: what changed, files modified, APIs
      added/changed, database changes, frontend changes, backend changes, and
      remaining work — naming "none" explicitly where a category is untouched.
- [ ] `git status` reviewed, then changes committed and pushed
      ([§11](#11-git-commit-policy)).

## 14. Never Change Without Approval

Do **not** change any of the following without explicit user approval:

- Database schema (tables, columns, constraints, types).
- Hotel slugs and the slug → folder image mapping.
- Public API routes/contracts that the frontend depends on.
- Port configuration (frontend `3000`, backend `5001`).
- Existing UI/design and brand.
- [`PROJECT_DOCS.md`](PROJECT_DOCS.md) content (preserve it).
- Environment/secret handling and `.env` structure.

## 15. AI Working Rules

- **Documentation-only requests must not modify application code.**
- Do not invent data, endpoints, columns, or behavior. If unknown → `TODO`.
- Prefer editing existing files over creating new ones; never create files
  unnecessarily.
- Respect all rules in this file and in `docs/`.
- If a request conflicts with a rule in [Section 14](#14-never-change-without-approval),
  stop and ask for approval.
- Keep the three canonical sources (`AGENTS.md`, `PROJECT_DOCS.md`, `docs/`) accurate
  so the next AI can continue seamlessly.

## 16. Security Rules

- Never commit secrets; keep them in `.env` (git-ignored). Template: `backend/.env.example`.
- Do not log or expose credentials, tokens, or PII.
- Validate and sanitize inputs on write endpoints (e.g. `POST /api/inquiries`),
  using the existing `validate` middleware + controller checks.
- Keep the baseline protections in place: `helmet`, CORS allow-list, request-size
  limits, and rate limiting. Error responses must never leak stack traces in production.
- Follow least-privilege for database and services.
- Full policy: [`docs/11_SECURITY.md`](docs/11_SECURITY.md).

## 17. Performance Rules

- Keep image assets reasonably sized; use appropriate formats and dimensions.
- Reuse the database connection pool; avoid per-request connections.
- Avoid unnecessary re-fetching; respect existing caching/revalidation behavior.
- Skip empty categories/sections rather than rendering wasteful/broken UI.
- TODO: Add measured performance budgets in [`docs/`](docs/) as they are defined.

## 18. Reference Index

| Topic | Document |
|-------|----------|
| README | [`README.md`](README.md) |
| Overview | [`docs/00_PROJECT_OVERVIEW.md`](docs/00_PROJECT_OVERVIEW.md) |
| Status | [`docs/01_PROJECT_STATUS.md`](docs/01_PROJECT_STATUS.md) |
| Architecture | [`docs/02_ARCHITECTURE.md`](docs/02_ARCHITECTURE.md) |
| Database | [`docs/03_DATABASE.md`](docs/03_DATABASE.md) |
| API | [`docs/04_API.md`](docs/04_API.md) |
| Folder structure | [`docs/05_FOLDER_STRUCTURE.md`](docs/05_FOLDER_STRUCTURE.md) |
| Setup | [`docs/06_SETUP_GUIDE.md`](docs/06_SETUP_GUIDE.md) |
| Coding rules | [`docs/07_CODING_RULES.md`](docs/07_CODING_RULES.md) |
| AI context | [`docs/08_AI_CONTEXT.md`](docs/08_AI_CONTEXT.md) |
| Business rules | [`docs/09_BUSINESS_RULES.md`](docs/09_BUSINESS_RULES.md) |
| UI guidelines | [`docs/10_UI_GUIDELINES.md`](docs/10_UI_GUIDELINES.md) |
| Security | [`docs/11_SECURITY.md`](docs/11_SECURITY.md) |
| Deployment | [`docs/12_DEPLOYMENT.md`](docs/12_DEPLOYMENT.md) |
| Roadmap | [`docs/13_ROADMAP.md`](docs/13_ROADMAP.md) |
| Changelog | [`docs/CHANGELOG.md`](docs/CHANGELOG.md) |
| Legacy reference | [`PROJECT_DOCS.md`](PROJECT_DOCS.md) |

---

*Keep this manual current. If the project's rules, stack, or structure change,
update `AGENTS.md` first, then the relevant `docs/` file and `CHANGELOG.md`.*
