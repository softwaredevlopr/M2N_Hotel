-- M2N Hotel — Phase 1 initial schema
-- Multi-property hotel chain ready (no auth tables in this phase)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared trigger: auto-update updated_at on row change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 1. hotels — root entity for each property in the chain
-- ---------------------------------------------------------------------------
CREATE TABLE hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(255) NOT NULL,
  tagline VARCHAR(500),
  description TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  website_url VARCHAR(500),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(120),
  state VARCHAR(120),
  country VARCHAR(120) NOT NULL DEFAULT 'India',
  postal_code VARCHAR(20),
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  check_in_time TIME NOT NULL DEFAULT '14:00',
  check_out_time TIME NOT NULL DEFAULT '11:00',
  currency_code CHAR(3) NOT NULL DEFAULT 'INR',
  star_rating SMALLINT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hotels_slug_unique UNIQUE (slug),
  CONSTRAINT hotels_status_check CHECK (
    status IN ('draft', 'active', 'inactive', 'archived')
  ),
  CONSTRAINT hotels_star_rating_check CHECK (
    star_rating IS NULL OR star_rating BETWEEN 1 AND 5
  )
);

CREATE INDEX idx_hotels_slug ON hotels (slug);
CREATE INDEX idx_hotels_status ON hotels (status);
CREATE INDEX idx_hotels_created_at ON hotels (created_at);
CREATE INDEX idx_hotels_is_featured ON hotels (is_featured) WHERE is_featured = TRUE;

CREATE TRIGGER trg_hotels_updated_at
  BEFORE UPDATE ON hotels
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. hotel_media — images/videos per property
-- ---------------------------------------------------------------------------
CREATE TABLE hotel_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL,
  media_type VARCHAR(30) NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hotel_media_hotel_id_fkey
    FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE CASCADE,
  CONSTRAINT hotel_media_type_check CHECK (
    media_type IN ('image', 'video', 'document')
  ),
  CONSTRAINT hotel_media_status_check CHECK (
    status IN ('active', 'inactive', 'archived')
  )
);

CREATE INDEX idx_hotel_media_hotel_id ON hotel_media (hotel_id);
CREATE INDEX idx_hotel_media_status ON hotel_media (status);
CREATE INDEX idx_hotel_media_created_at ON hotel_media (created_at);
CREATE INDEX idx_hotel_media_hotel_sort ON hotel_media (hotel_id, sort_order);

CREATE TRIGGER trg_hotel_media_updated_at
  BEFORE UPDATE ON hotel_media
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. amenities — global master catalog (reused across properties)
-- ---------------------------------------------------------------------------
CREATE TABLE amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(80) NOT NULL DEFAULT 'general',
  icon VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT amenities_slug_unique UNIQUE (slug)
);

CREATE INDEX idx_amenities_slug ON amenities (slug);
CREATE INDEX idx_amenities_category ON amenities (category);
CREATE INDEX idx_amenities_created_at ON amenities (created_at);
CREATE INDEX idx_amenities_is_active ON amenities (is_active);

CREATE TRIGGER trg_amenities_updated_at
  BEFORE UPDATE ON amenities
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. hotel_amenities — which amenities each property offers
-- ---------------------------------------------------------------------------
CREATE TABLE hotel_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL,
  amenity_id UUID NOT NULL,
  is_highlighted BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hotel_amenities_hotel_id_fkey
    FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE CASCADE,
  CONSTRAINT hotel_amenities_amenity_id_fkey
    FOREIGN KEY (amenity_id) REFERENCES amenities (id) ON DELETE CASCADE,
  CONSTRAINT hotel_amenities_hotel_amenity_unique UNIQUE (hotel_id, amenity_id)
);

CREATE INDEX idx_hotel_amenities_hotel_id ON hotel_amenities (hotel_id);
CREATE INDEX idx_hotel_amenities_amenity_id ON hotel_amenities (amenity_id);
CREATE INDEX idx_hotel_amenities_created_at ON hotel_amenities (created_at);

CREATE TRIGGER trg_hotel_amenities_updated_at
  BEFORE UPDATE ON hotel_amenities
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. room_types — room categories per property (Deluxe, Suite, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  base_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  max_occupancy SMALLINT NOT NULL DEFAULT 2,
  bed_type VARCHAR(80),
  room_size_sqft INTEGER,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT room_types_hotel_id_fkey
    FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE CASCADE,
  CONSTRAINT room_types_hotel_slug_unique UNIQUE (hotel_id, slug),
  CONSTRAINT room_types_status_check CHECK (
    status IN ('draft', 'active', 'inactive', 'archived')
  ),
  CONSTRAINT room_types_base_price_check CHECK (base_price >= 0),
  CONSTRAINT room_types_max_occupancy_check CHECK (max_occupancy > 0),
  CONSTRAINT room_types_room_size_check CHECK (
    room_size_sqft IS NULL OR room_size_sqft > 0
  )
);

CREATE INDEX idx_room_types_hotel_id ON room_types (hotel_id);
CREATE INDEX idx_room_types_slug ON room_types (slug);
CREATE INDEX idx_room_types_status ON room_types (status);
CREATE INDEX idx_room_types_created_at ON room_types (created_at);
CREATE INDEX idx_room_types_hotel_status ON room_types (hotel_id, status);

CREATE TRIGGER trg_room_types_updated_at
  BEFORE UPDATE ON room_types
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. rooms — physical inventory per property
-- ---------------------------------------------------------------------------
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL,
  room_type_id UUID NOT NULL,
  room_number VARCHAR(30) NOT NULL,
  floor_label VARCHAR(30),
  status VARCHAR(30) NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rooms_hotel_id_fkey
    FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE CASCADE,
  CONSTRAINT rooms_room_type_id_fkey
    FOREIGN KEY (room_type_id) REFERENCES room_types (id) ON DELETE RESTRICT,
  CONSTRAINT rooms_hotel_room_number_unique UNIQUE (hotel_id, room_number),
  CONSTRAINT rooms_status_check CHECK (
    status IN ('available', 'occupied', 'maintenance', 'blocked', 'out_of_service')
  ),
  CONSTRAINT rooms_hotel_room_type_hotel_check CHECK (
    hotel_id IS NOT NULL
  )
);

CREATE INDEX idx_rooms_hotel_id ON rooms (hotel_id);
CREATE INDEX idx_rooms_room_type_id ON rooms (room_type_id);
CREATE INDEX idx_rooms_status ON rooms (status);
CREATE INDEX idx_rooms_created_at ON rooms (created_at);
CREATE INDEX idx_rooms_hotel_status ON rooms (hotel_id, status);

CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. inquiries — guest booking/contact requests per property
-- ---------------------------------------------------------------------------
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL,
  room_type_id UUID,
  guest_name VARCHAR(150) NOT NULL,
  guest_email VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(50),
  check_in_date DATE,
  check_out_date DATE,
  adults_count SMALLINT NOT NULL DEFAULT 1,
  children_count SMALLINT NOT NULL DEFAULT 0,
  message TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'website',
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inquiries_hotel_id_fkey
    FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE CASCADE,
  CONSTRAINT inquiries_room_type_id_fkey
    FOREIGN KEY (room_type_id) REFERENCES room_types (id) ON DELETE SET NULL,
  CONSTRAINT inquiries_status_check CHECK (
    status IN ('pending', 'contacted', 'quoted', 'confirmed', 'declined', 'cancelled')
  ),
  CONSTRAINT inquiries_source_check CHECK (
    source IN ('website', 'phone', 'email', 'walk_in', 'partner', 'other')
  ),
  CONSTRAINT inquiries_adults_count_check CHECK (adults_count > 0),
  CONSTRAINT inquiries_children_count_check CHECK (children_count >= 0),
  CONSTRAINT inquiries_date_range_check CHECK (
    check_in_date IS NULL
    OR check_out_date IS NULL
    OR check_out_date > check_in_date
  )
);

CREATE INDEX idx_inquiries_hotel_id ON inquiries (hotel_id);
CREATE INDEX idx_inquiries_status ON inquiries (status);
CREATE INDEX idx_inquiries_created_at ON inquiries (created_at);
CREATE INDEX idx_inquiries_hotel_status ON inquiries (hotel_id, status);
CREATE INDEX idx_inquiries_check_in_date ON inquiries (check_in_date);

CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- Data integrity: room must belong to the same hotel as its room_type
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_room_hotel_consistency()
RETURNS TRIGGER AS $$
DECLARE
  type_hotel_id UUID;
BEGIN
  SELECT hotel_id INTO type_hotel_id
  FROM room_types
  WHERE id = NEW.room_type_id;

  IF type_hotel_id IS NULL THEN
    RAISE EXCEPTION 'room_type_id % does not exist', NEW.room_type_id;
  END IF;

  IF NEW.hotel_id <> type_hotel_id THEN
    RAISE EXCEPTION 'room hotel_id must match room_type hotel_id';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rooms_hotel_consistency
  BEFORE INSERT OR UPDATE ON rooms
  FOR EACH ROW
  EXECUTE PROCEDURE validate_room_hotel_consistency();
