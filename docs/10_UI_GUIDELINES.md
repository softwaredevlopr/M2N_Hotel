# 10 — UI Guidelines

> **Status:** Living document · **Last updated:** 2026-07-14

---

## 1. Design principles

- Preserve existing public and admin visual language unless a redesign is requested.
- Public site: luxury hospitality brand (cream / ink / gold).
- Admin console: luxury **dark** ink theme with gold accents (match Hotels module).

## 2. Brand

- Brand name: **M2N Hotels** (`lib/brand.js`).
- Display typography: project display font (`font-display`); body uses cream tones
  on ink backgrounds for admin, branded public styles in `globals.css`.

## 3. Layout & components

**Public**

- Full-bleed heroes on promotional surfaces; hotel-scoped galleries and room cards.
- One job per section; skip empty data categories.

**Admin**

- Shared shell: `AdminGuard` (nav + toast provider).
- Patterns: table lists, filters, confirm dialogs, toast success/error, form
  sections with gold focus borders.
- Modules: Hotels, Room Types, Rooms, Media (Inquiries TBD).

## 4. Imagery

- Public: slug → `Photos/` mapping only.
- Admin media: preview via API origin + `/uploads/…` when relative.

## 5. Accessibility

- Prefer `aria-live` for form/toast feedback; descriptive `alt` text.
- Visible `:focus-visible` rings (global CSS).

## 6. Responsiveness

- Public and admin layouts must work on mobile and desktop.
- Admin tables may scroll horizontally on small screens.
