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

**Booking flow (`/book`)**

- Numbered five-step header (Stay Details → Available Rooms → Guest Details →
  Review → Confirmation); one step visible at a time on mobile.
- Two columns from `lg` up: step content left, stay summary sticky on the right
  (steps 1–4). Confirmation is a centred success panel with Home / View Hotel.
- Selection tiles (hotels, available rooms) are `<button aria-pressed>` with a
  gold border and check badge when active — not links.
- Fields reuse the inquiry-form styling via `components/booking/formStyles.js`;
  errors sit inline under the field in gold, and the form-level banner uses
  `role="alert"`.
- The `/booking/[bookingNumber]` lookup page remains a printable document:
  reference block, stay details, charges, and a print action.

**Admin**

- Shared shell: `AdminGuard` (nav + toast provider).
- Patterns: table lists, filters, confirm dialogs, toast success/error, form
  sections with gold focus borders.
- Modules: Hotels, Room Types, Rooms, Media, Tariffs (Bookings and Inquiries TBD).

## 4. Imagery

- Public: slug → `Photos/` mapping only on hotel surfaces.
- Homepage brand hero: `/brand-hero.jpg` only (restored from Git `336582d`;
  [ADR-0018](history/DECISIONS.md)); never `/Photos/` and never logo artwork as
  the hero background.
- `lib/images.js` touches the filesystem, so client components must be handed
  resolved URLs from a server component rather than importing it.
- Admin media: preview via API origin + `/uploads/…` when relative.

## 5. Accessibility

- Prefer `aria-live` for form/toast feedback; descriptive `alt` text.
- Visible `:focus-visible` rings (global CSS).

## 6. Responsiveness

- Public and admin layouts must work on mobile and desktop.
- Admin tables may scroll horizontally on small screens.
