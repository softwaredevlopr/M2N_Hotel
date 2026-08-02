# 09 — Business Rules

> **Status:** Living document · **Last updated:** 2026-07-14

---

## 1. Overview

Domain rules the product must enforce. Schema changes require explicit approval.

## 2. Hotel & content rules

- Each hotel has a unique, stable **slug**.
- Content (rooms, media, amenities, inquiries) is scoped per `hotel_id`.
- Public site currently mixes API hotel records with filesystem `Photos/` imagery;
  Phase 8 will deepen API-driven presentation.
- Published public lists default to `status = active` where applicable.

## 3. Image rules

- **Never mix photos between hotels.** Public imagery uses slug →
  `/Photos/<Hotel>/…` only.
- Empty category folders are skipped (no broken UI).
- Admin media uploads are separate (`backend/uploads/…`) and stored in
  `hotel_media`; categories are path-encoded (no category column).
- Featured/cover media uses `hotel_media.is_cover` (one cover per hotel when set
  via admin). Resolution normalises to exactly one cover: it drives the hero, and
  every other active image goes to the gallery by `sort_order`.
- **Stock/demo imagery is never valid hotel media.** URLs on known placeholder
  hosts (Unsplash, placehold.co, picsum, dummyimage, …) are rejected during
  resolution, so such rows cannot render even if present in `hotel_media`.
- Fallbacks are hotel-scoped: once a hotel is known, an unavailable image falls
  back only within that hotel's own folder, never to another property's photos.
  See [ADR-0013](history/DECISIONS.md).

## 4. Inquiry rules

- Guests submit inquiries via `POST /api/inquiries` (validated; rate-limited).
- Required fields enforced by API validators (name, email, etc. — see code).
- Inquiry handling/admin CRM UI is upcoming (roadmap Phase 13 / inquiries admin).

## 5. Booking rules (Phase 10A)

- A reservation always belongs to one hotel; the chosen room type must belong to
  that hotel. Multi-property isolation is enforced on every write.
- Sellable inventory = `rooms` of that room type with status `available` or
  `occupied`. `maintenance`, `blocked` and `out_of_service` are excluded.
- A stay holds inventory on every night from check-in up to (not including)
  check-out, so the checkout date is immediately resellable.
- Only `pending`, `confirmed` and `checked_in` hold inventory. Cancelling or
  marking a no-show releases it.
- Availability is judged on the **busiest single night** of the requested stay,
  never a total of overlapping reservations ([ADR-0014](history/DECISIONS.md)).
- Public bookings are always `pending` / `unpaid` / `website`, must be for an
  active hotel and active room type, and cannot start in the past.
- Public pricing is derived from `room_types.base_price`; a base price of `0`
  means "on request" and leaves totals at zero. Guest-supplied amounts are ignored.
- Status flow: `pending → confirmed | cancelled | no_show`,
  `confirmed → checked_in | cancelled | no_show`,
  `checked_in → checked_out | cancelled`. The rest are terminal.
- A physical room is never auto-allocated. Admins assign one explicitly, and only
  for single-room reservations.
- Guests may view a booking only with the booking number **plus** the email or
  phone on it.

## 6. Admin rules

- Admin mutations require JWT (`requireAdminAuth`).
- Room type must belong to the same hotel as the room.
- Room activate/deactivate maps to inventory statuses `available` /
  `out_of_service` (no separate active flag on `rooms`).

## 7. Upcoming domain areas

Per-date allotment, stop-sells and overbooking allowances (Phase 10B), and
payments/invoicing (Phase 14) are not yet productized in the database.
