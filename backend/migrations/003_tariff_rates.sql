-- M2N Hotels — Phase 9 tariff / rate management

CREATE TABLE tariff_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL,
  room_type_id UUID,
  meal_plan VARCHAR(40) NOT NULL,
  occupancy VARCHAR(20) NOT NULL,
  price NUMERIC(12, 2),
  display_note VARCHAR(255),
  valid_from DATE,
  valid_to DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tariff_rates_hotel_id_fkey
    FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE CASCADE,
  CONSTRAINT tariff_rates_room_type_id_fkey
    FOREIGN KEY (room_type_id) REFERENCES room_types (id) ON DELETE CASCADE,
  CONSTRAINT tariff_rates_meal_plan_check CHECK (
    meal_plan IN ('no_meal', 'breakfast', 'breakfast_one_meal', 'all_meals')
  ),
  CONSTRAINT tariff_rates_occupancy_check CHECK (
    occupancy IN ('single', 'double')
  ),
  CONSTRAINT tariff_rates_status_check CHECK (
    status IN ('active', 'inactive')
  ),
  CONSTRAINT tariff_rates_price_check CHECK (
    price IS NULL OR price >= 0
  ),
  CONSTRAINT tariff_rates_valid_range_check CHECK (
    valid_from IS NULL
    OR valid_to IS NULL
    OR valid_from <= valid_to
  )
);

CREATE INDEX idx_tariff_rates_hotel_id ON tariff_rates (hotel_id);
CREATE INDEX idx_tariff_rates_room_type_id ON tariff_rates (room_type_id);
CREATE INDEX idx_tariff_rates_status ON tariff_rates (status);
CREATE INDEX idx_tariff_rates_meal_plan ON tariff_rates (meal_plan);
CREATE INDEX idx_tariff_rates_hotel_status ON tariff_rates (hotel_id, status);
CREATE INDEX idx_tariff_rates_valid_from ON tariff_rates (valid_from);
CREATE INDEX idx_tariff_rates_valid_to ON tariff_rates (valid_to);
CREATE INDEX idx_tariff_rates_created_at ON tariff_rates (created_at);

CREATE TRIGGER trg_tariff_rates_updated_at
  BEFORE UPDATE ON tariff_rates
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();
