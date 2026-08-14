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
  Review → Confirmation); one step visible at a time on mobile. After submit,
  guests are redirected to `/booking/[bookingNumber]` (session-verified).
- Two columns from `lg` up: step content left, stay summary sticky on the right
  (steps 1–4). On smaller screens the Continue/Confirm bar sits above the
  summary (sticky bottom). Confirmation fallback is a centred success panel
  whose primary CTA is Manage reservation.
- Selection tiles (hotels, available rooms) are `<button aria-pressed>` with a
  gold border and check badge when active — not links.
- Fields reuse the inquiry-form styling via `components/booking/formStyles.js`;
  errors sit inline under the field in gold, and the form-level banner uses
  `role="alert"`.
- The `/booking` page collects a reference + email/mobile, then opens lookup.
  `/booking/[bookingNumber]` remains a printable document: reference block,
  stay details, charges, and a print action (nav/footer/actions hidden in print).
- Eligible guests (`pending` / `confirmed`) can open an inline cancel confirm
  panel with optional reason; cancelled state refreshes in place. Stay modify
  requires an availability check before save.

**Admin inventory calendar (`/admin/inventory`)**

- Monthly Monday-first grid; prev/next month controls.
- Hotel and room-type selectors; “All room types” aggregates day totals.
- Day cells show total / booked / remaining and occupancy %; colors:
  emerald available, amber low (≤25% remaining), rose sold out / stop-sell.
- With a room type selected, click a day to open the day-edit panel
  (allotment / stop-sell / overbooking / source). Clear override uses
  ConfirmDialog and explains fallback to default availability.
- Loading, empty (no hotel / no room types), and error states required.

**Admin create booking (`/admin/bookings/new`)**

- Sections: guest details, stay (hotel/room type/dates/guests/rooms), options
  (source/status/payment), guest special requests (`special_requests`),
  internal notes (`admin_notes`, private), price summary.
- Availability check button + blocking submit when inventory probe says sold out.
- Confirmation screen after create with View booking / Create another actions.
- Match existing admin form chrome (ink panels, gold CTAs, uppercase labels).

**Admin booking detail (`/admin/bookings/[id]`)**

- Guest special requests and Internal notes are separate sections.
- Internal notes labelled “Private — visible to hotel staff only”; dashed border.
- **Cancel booking** uses ConfirmDialog; cancellation reason is optional.
  No-show still requires a reason via the status dialog.
- Cancel / no-show reasons map to `cancellation_reason` (not internal notes).

**Admin inquiries (`/admin/inquiries`)**

- List table with search, hotel/status filters, pagination.
- Detail: guest/stay/message + status/`admin_notes` form; delete via ConfirmDialog.
- Loading, empty, and error states; toast on success/failure.

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
