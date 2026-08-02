-- M2N Hotels — Phase 1 admin authentication
-- Adds admin_users for JWT-based admin login (multi-property SaaS ready).
-- Does not alter existing hotel/inquiry tables.

-- ---------------------------------------------------------------------------
-- admin_users — platform / property administrators
-- ---------------------------------------------------------------------------
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'hotel_admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_users_email_unique UNIQUE (email),
  CONSTRAINT admin_users_role_check CHECK (
    role IN ('super_admin', 'hotel_admin')
  )
);

CREATE INDEX idx_admin_users_email ON admin_users (email);
CREATE INDEX idx_admin_users_role ON admin_users (role);
CREATE INDEX idx_admin_users_is_active ON admin_users (is_active);

CREATE TRIGGER trg_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();
