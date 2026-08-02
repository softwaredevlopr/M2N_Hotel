# 07 — Coding Rules & Conventions

> **Status:** Living document · **Last updated:** 2026-07-14  
> **Authority:** Also see [`../AGENTS.md`](../AGENTS.md)

---

## 1. General principles

- Keep changes minimal and scoped to the request.
- Match existing style in the file you edit.
- Do not invent schema, prices, or endpoints — confirm or use `TODO`.
- Documentation-only requests must not change application code.
- Never commit secrets.

## 2. Naming

- Hotel **slugs** are URL-safe and stable.
- Admin API clients: `frontend/src/lib/admin*.js`.
- Backend modules: `adminX.controller.js` / `adminX.routes.js` / `adminX.validator.js`.

## 3. Frontend

- Next.js App Router under `frontend/src/app/`.
- Hotel detail: `/hotels/[slug]`.
- Admin: `/admin/...` behind `AdminGuard`.
- Images: slug → folder mapping; skip empty categories.
- Prefer editing existing components over creating parallel ones.

## 4. Backend

- All DB access via `config/db.js` helpers.
- Use `asyncHandler`, `AppError`, `sendSuccess` / `sendValidationError`.
- Protect admin writes with `requireAdminAuth`.
- Do not break public route contracts when adding admin APIs.
- `/health` must remain a working server + DB check.

## 5. Git

- Commit only when asked.
- Clear messages focused on *why*.
- No force-push to main; no secrets in commits.

## 6. Testing

- Automated tests are still light — verify with build (`frontend npm run build`)
  and smoke checks (`/health`, admin login) when behavior changes.
