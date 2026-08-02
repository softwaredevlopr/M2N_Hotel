-- M2N Hotels — Phase 10A booking engine backend foundation
-- Adds the bookings table for direct hotel reservations.
-- Does not alter existing hotel / room / inquiry / tariff tables.

-- ---------------------------------------------------------------------------
-- bookings — direct reservations per property
-- ---------------------------------------------------------------------------
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number VARCHAR(30) NOT NULL,
  hotel_id UUID NOT NULL,
  room_type_id UUID NOT NULL,
  room_id UUID,
  guest_name VARCHAR(150) NOT NULL,
  guest_email VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(50) NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  adults SMALLINT NOT NULL DEFAULT 1,
  children SMALLINT NOT NULL DEFAULT 0,
  number_of_rooms SMALLINT NOT NULL DEFAULT 1,
  booking_source VARCHAR(30) NOT NULL DEFAULT 'website',
  booking_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
  special_requests TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  created_by_admin_id UUID,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_booking_number_unique UNIQUE (booking_number),
  -- Reservations are commercial records: the parent property/room type cannot be
  -- deleted out from under them, but an unassigned physical room may go away.
  CONSTRAINT bookings_hotel_id_fkey
    FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE RESTRICT,
  CONSTRAINT bookings_room_type_id_fkey
    FOREIGN KEY (room_type_id) REFERENCES room_types (id) ON DELETE RESTRICT,
  CONSTRAINT bookings_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES rooms (id) ON DELETE SET NULL,
  CONSTRAINT bookings_created_by_admin_id_fkey
    FOREIGN KEY (created_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT bookings_booking_status_check CHECK (
    booking_status IN (
      'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'
    )
  ),
  CONSTRAINT bookings_payment_status_check CHECK (
    payment_status IN ('unpaid', 'partial', 'paid', 'refunded')
  ),
  CONSTRAINT bookings_booking_source_check CHECK (
    booking_source IN ('website', 'admin', 'phone', 'walk_in', 'ota')
  ),
  CONSTRAINT bookings_date_range_check CHECK (check_out_date > check_in_date),
  CONSTRAINT bookings_adults_check CHECK (adults > 0),
  CONSTRAINT bookings_children_check CHECK (children >= 0),
  CONSTRAINT bookings_number_of_rooms_check CHECK (number_of_rooms > 0),
  CONSTRAINT bookings_subtotal_check CHECK (subtotal >= 0),
  CONSTRAINT bookings_tax_amount_check CHECK (tax_amount >= 0),
  CONSTRAINT bookings_total_amount_check CHECK (total_amount >= 0)
);

CREATE INDEX idx_bookings_hotel_id ON bookings (hotel_id);
CREATE INDEX idx_bookings_room_type_id ON bookings (room_type_id);
CREATE INDEX idx_bookings_room_id ON bookings (room_id);
CREATE INDEX idx_bookings_booking_status ON bookings (booking_status);
CREATE INDEX idx_bookings_payment_status ON bookings (payment_status);
CREATE INDEX idx_bookings_check_in_date ON bookings (check_in_date);
CREATE INDEX idx_bookings_check_out_date ON bookings (check_out_date);
CREATE INDEX idx_bookings_created_at ON bookings (created_at);
CREATE INDEX idx_bookings_hotel_status ON bookings (hotel_id, booking_status);
CREATE INDEX idx_bookings_guest_email ON bookings (guest_email);
CREATE INDEX idx_bookings_guest_phone ON bookings (guest_phone);

-- Availability lookups scan active reservations for a room type over a date range.
CREATE INDEX idx_bookings_availability
  ON bookings (room_type_id, check_in_date, check_out_date)
  WHERE booking_status IN ('pending', 'confirmed', 'checked_in');

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();
