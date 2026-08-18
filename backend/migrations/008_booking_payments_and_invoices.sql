-- M2N Hotels — Phase 14 Payments & Invoice Lite schema foundation
-- Additive financial tables only: no application/API/frontend changes here.
-- Creates:
--   1) hotel_invoice_sequences
--   2) booking_invoices
--   3) booking_payments
-- Existing bookings.payment_status remains the summary field used by surfaces.

-- ---------------------------------------------------------------------------
-- hotel_invoice_sequences — per-hotel yearly invoice number allocator
-- ---------------------------------------------------------------------------
CREATE TABLE hotel_invoice_sequences (
  hotel_id UUID NOT NULL,
  year SMALLINT NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (hotel_id, year),
  CONSTRAINT hotel_invoice_sequences_hotel_id_fkey
    FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE RESTRICT,
  CONSTRAINT hotel_invoice_sequences_year_check CHECK (year >= 2000 AND year <= 2100),
  CONSTRAINT hotel_invoice_sequences_last_sequence_check CHECK (last_sequence >= 0)
);

CREATE INDEX idx_hotel_invoice_sequences_year
  ON hotel_invoice_sequences (year);

CREATE TRIGGER trg_hotel_invoice_sequences_updated_at
  BEFORE UPDATE ON hotel_invoice_sequences
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- booking_invoices — immutable issued invoice snapshots per booking
-- ---------------------------------------------------------------------------
CREATE TABLE booking_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL,
  booking_id UUID NOT NULL,
  invoice_number VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  replaces_invoice_id UUID,
  issued_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,

  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  tax_rate_label VARCHAR(120),
  tax_rate_percent NUMERIC(5, 2),

  seller_name VARCHAR(255) NOT NULL,
  seller_email VARCHAR(255),
  seller_phone VARCHAR(50),
  seller_address_line1 VARCHAR(255),
  seller_address_line2 VARCHAR(255),
  seller_city VARCHAR(120),
  seller_state VARCHAR(120),
  seller_country VARCHAR(120) NOT NULL DEFAULT 'India',
  seller_postal_code VARCHAR(20),
  seller_gstin VARCHAR(15),
  seller_pan VARCHAR(10),

  buyer_name VARCHAR(150) NOT NULL,
  buyer_email VARCHAR(255),
  buyer_phone VARCHAR(50),
  buyer_gstin VARCHAR(15),

  booking_number VARCHAR(30) NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights SMALLINT NOT NULL,
  room_type_name VARCHAR(255) NOT NULL,
  number_of_rooms SMALLINT NOT NULL DEFAULT 1,
  adults SMALLINT NOT NULL DEFAULT 1,
  children SMALLINT NOT NULL DEFAULT 0,
  line_description TEXT NOT NULL,
  hsn_sac VARCHAR(20),
  place_of_supply VARCHAR(120),

  notes TEXT,
  created_by_admin_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT booking_invoices_hotel_id_fkey
    FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE RESTRICT,
  CONSTRAINT booking_invoices_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
  CONSTRAINT booking_invoices_replaces_invoice_id_fkey
    FOREIGN KEY (replaces_invoice_id) REFERENCES booking_invoices (id) ON DELETE RESTRICT,
  CONSTRAINT booking_invoices_created_by_admin_id_fkey
    FOREIGN KEY (created_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT booking_invoices_hotel_invoice_number_unique
    UNIQUE (hotel_id, invoice_number),
  CONSTRAINT booking_invoices_status_check CHECK (
    status IN ('draft', 'issued', 'void')
  ),
  CONSTRAINT booking_invoices_subtotal_check CHECK (subtotal >= 0),
  CONSTRAINT booking_invoices_tax_amount_check CHECK (tax_amount >= 0),
  CONSTRAINT booking_invoices_total_amount_check CHECK (total_amount >= 0),
  CONSTRAINT booking_invoices_total_formula_check CHECK (
    total_amount = subtotal + tax_amount
  ),
  CONSTRAINT booking_invoices_tax_rate_percent_check CHECK (
    tax_rate_percent IS NULL OR tax_rate_percent >= 0
  ),
  CONSTRAINT booking_invoices_seller_gstin_format_check CHECK (
    seller_gstin IS NULL OR seller_gstin ~ '^[0-9A-Z]{15}$'
  ),
  CONSTRAINT booking_invoices_seller_pan_format_check CHECK (
    seller_pan IS NULL OR seller_pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'
  ),
  CONSTRAINT booking_invoices_buyer_gstin_format_check CHECK (
    buyer_gstin IS NULL OR buyer_gstin ~ '^[0-9A-Z]{15}$'
  ),
  CONSTRAINT booking_invoices_date_range_check CHECK (check_out_date > check_in_date),
  CONSTRAINT booking_invoices_nights_check CHECK (nights > 0),
  CONSTRAINT booking_invoices_number_of_rooms_check CHECK (number_of_rooms > 0),
  CONSTRAINT booking_invoices_adults_check CHECK (adults > 0),
  CONSTRAINT booking_invoices_children_check CHECK (children >= 0),
  CONSTRAINT booking_invoices_lifecycle_check CHECK (
    (status = 'draft' AND issued_at IS NULL AND voided_at IS NULL)
    OR (status = 'issued' AND issued_at IS NOT NULL AND voided_at IS NULL)
    OR (status = 'void' AND issued_at IS NOT NULL AND voided_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX booking_invoices_one_issued_per_booking
  ON booking_invoices (booking_id)
  WHERE status = 'issued';

CREATE INDEX idx_booking_invoices_hotel_id
  ON booking_invoices (hotel_id);

CREATE INDEX idx_booking_invoices_booking_id
  ON booking_invoices (booking_id);

CREATE INDEX idx_booking_invoices_hotel_status
  ON booking_invoices (hotel_id, status);

CREATE INDEX idx_booking_invoices_hotel_issued_at
  ON booking_invoices (hotel_id, issued_at DESC)
  WHERE status = 'issued';

CREATE TRIGGER trg_booking_invoices_updated_at
  BEFORE UPDATE ON booking_invoices
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- booking_payments — append-only manual payment/refund ledger per booking
-- ---------------------------------------------------------------------------
CREATE TABLE booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL,
  booking_id UUID NOT NULL,
  entry_type VARCHAR(20) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference_code VARCHAR(120),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  idempotency_key VARCHAR(64),
  external_provider VARCHAR(30),
  external_transaction_id VARCHAR(120),
  created_by_admin_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT booking_payments_hotel_id_fkey
    FOREIGN KEY (hotel_id) REFERENCES hotels (id) ON DELETE RESTRICT,
  CONSTRAINT booking_payments_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
  CONSTRAINT booking_payments_created_by_admin_id_fkey
    FOREIGN KEY (created_by_admin_id) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT booking_payments_entry_type_check CHECK (
    entry_type IN ('payment', 'refund')
  ),
  CONSTRAINT booking_payments_payment_method_check CHECK (
    payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'other')
  ),
  CONSTRAINT booking_payments_amount_check CHECK (amount > 0),
  CONSTRAINT booking_payments_status_check CHECK (
    status IN ('active', 'void')
  ),
  CONSTRAINT booking_payments_void_consistency_check CHECK (
    (status = 'active' AND voided_at IS NULL)
    OR (status = 'void' AND voided_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX booking_payments_idempotency_unique
  ON booking_payments (hotel_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX idx_booking_payments_hotel_id
  ON booking_payments (hotel_id);

CREATE INDEX idx_booking_payments_booking_id
  ON booking_payments (booking_id);

CREATE INDEX idx_booking_payments_hotel_booking
  ON booking_payments (hotel_id, booking_id);

CREATE INDEX idx_booking_payments_recorded_at
  ON booking_payments (recorded_at DESC);

CREATE INDEX idx_booking_payments_hotel_recorded_at
  ON booking_payments (hotel_id, recorded_at DESC);

CREATE INDEX idx_booking_payments_reference_code
  ON booking_payments (reference_code)
  WHERE reference_code IS NOT NULL;

CREATE INDEX idx_booking_payments_active_status
  ON booking_payments (status)
  WHERE status = 'active';

CREATE TRIGGER trg_booking_payments_updated_at
  BEFORE UPDATE ON booking_payments
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();
