-- M2N Hotels — Phase 10I persistent room-type inventory dates
-- Adds stop-sell, allotment override, and overbooking allowance per night.
-- Does not alter hotels, room_types, rooms, bookings, or existing data rows.
-- Sparse: missing row = physical inventory − bookings (Phase 10D behaviour).

-- ---------------------------------------------------------------------------
-- room_type_inventory_dates — per hotel / room type / night overrides
-- ---------------------------------------------------------------------------
CREATE TABLE room_type_inventory_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL,
  room_type_id UUID NOT NULL,
  inventory_date DATE NOT NULL,
  allotment SMALLINT,
  stop_sell BOOLEAN NOT NULL DEFAULT FALSE,
  overbooking_allowance SMALLINT NOT NULL DEFAULT 0,
  notes TEXT,
  source VARCHAR(30) NOT NULL DEFAULT 'manual',
  external_ref VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT room_type_inventory_dates_hotel_id_fkey
    FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE CASCADE,
  CONSTRAINT room_type_inventory_dates_room_type_id_fkey
    FOREIGN KEY (room_type_id) REFERENCES room_types (id) ON DELETE CASCADE,
  CONSTRAINT room_type_inventory_dates_hotel_type_date_unique
    UNIQUE (hotel_id, room_type_id, inventory_date),
  CONSTRAINT room_type_inventory_dates_allotment_check CHECK (
    allotment IS NULL OR allotment >= 0
  ),
  CONSTRAINT room_type_inventory_dates_overbooking_check CHECK (
    overbooking_allowance >= 0
  ),
  CONSTRAINT room_type_inventory_dates_source_check CHECK (
    source IN ('manual', 'system', 'ota', 'channel')
  )
);

CREATE INDEX idx_room_type_inventory_dates_hotel_date
  ON room_type_inventory_dates (hotel_id, inventory_date);

CREATE INDEX idx_room_type_inventory_dates_type_date
  ON room_type_inventory_dates (room_type_id, inventory_date);

CREATE TRIGGER trg_room_type_inventory_dates_updated_at
  BEFORE UPDATE ON room_type_inventory_dates
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();
