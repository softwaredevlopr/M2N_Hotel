-- M2N Hotels — Dedicated booking internal notes (admin_notes)
-- Adds a private staff-only notes column on bookings.
-- Does not alter special_requests, cancellation_reason, or other columns.
-- Additive + nullable: existing rows remain compatible (NULL).

-- ---------------------------------------------------------------------------
-- bookings.admin_notes — private hotel/admin staff notes (never public)
-- ---------------------------------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN admin_notes TEXT;
