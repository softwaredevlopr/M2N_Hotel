-- M2N Hotels — Phase 11 booking notification preferences
-- Additive JSONB column for guest channel prefs on bookings.
-- Transactional confirmation/cancellation email is NOT gated by this object.
-- Reversible: ALTER TABLE bookings DROP COLUMN notification_preferences;

-- ---------------------------------------------------------------------------
-- bookings.notification_preferences
-- Keys: email_updates (status/stay emails), sms_opt_in, whatsapp_opt_in
-- ---------------------------------------------------------------------------
ALTER TABLE bookings
  ADD COLUMN notification_preferences JSONB NOT NULL
  DEFAULT '{"email_updates":true,"sms_opt_in":false,"whatsapp_opt_in":false}'::jsonb;

COMMENT ON COLUMN bookings.notification_preferences IS
  'Guest channel prefs: email_updates (status/stay emails); sms_opt_in; whatsapp_opt_in. Transactional confirm/cancel email is not gated by this object.';
