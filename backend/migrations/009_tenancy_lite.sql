-- M2N Hotels — Phase 15 Lite tenancy schema foundation
-- Adds tenants, tenant_memberships, hotels.tenant_id + non-destructive backfill.
-- Does not alter bookings, finance, inventory, or other hotel_id child tables.
-- AuthZ enforcement is a separate follow-on task after this migration.

-- ---------------------------------------------------------------------------
-- 1. tenants — operator / SaaS billing account
-- ---------------------------------------------------------------------------
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'trial',
  billing_email VARCHAR(255),
  plan_code VARCHAR(40) NOT NULL DEFAULT 'lite',
  subscription_status VARCHAR(30) NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenants_slug_unique UNIQUE (slug),
  CONSTRAINT tenants_status_check CHECK (
    status IN ('trial', 'active', 'suspended', 'cancelled')
  ),
  CONSTRAINT tenants_subscription_status_check CHECK (
    subscription_status IN ('trialing', 'active', 'past_due', 'cancelled')
  )
);

CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_tenants_status ON tenants (status);
CREATE INDEX idx_tenants_subscription_status ON tenants (subscription_status);
CREATE INDEX idx_tenants_created_at ON tenants (created_at);

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. tenant_memberships — admin_users ↔ tenants access grants
-- ---------------------------------------------------------------------------
CREATE TABLE tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  admin_user_id UUID NOT NULL,
  membership_role VARCHAR(30) NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_memberships_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  CONSTRAINT tenant_memberships_admin_user_id_fkey
    FOREIGN KEY (admin_user_id) REFERENCES admin_users (id) ON DELETE CASCADE,
  CONSTRAINT tenant_memberships_tenant_admin_unique UNIQUE (tenant_id, admin_user_id),
  CONSTRAINT tenant_memberships_role_check CHECK (
    membership_role IN ('owner', 'admin', 'staff')
  )
);

CREATE INDEX idx_tenant_memberships_tenant_id ON tenant_memberships (tenant_id);
CREATE INDEX idx_tenant_memberships_admin_user_id ON tenant_memberships (admin_user_id);
CREATE INDEX idx_tenant_memberships_tenant_active
  ON tenant_memberships (tenant_id, is_active)
  WHERE is_active = TRUE;
CREATE INDEX idx_tenant_memberships_admin_active
  ON tenant_memberships (admin_user_id, is_active)
  WHERE is_active = TRUE;

CREATE TRIGGER trg_tenant_memberships_updated_at
  BEFORE UPDATE ON tenant_memberships
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. hotels.tenant_id — property ownership (nullable until backfill)
-- ---------------------------------------------------------------------------
ALTER TABLE hotels
  ADD COLUMN tenant_id UUID;

-- ---------------------------------------------------------------------------
-- 4. Backfill — default tenant for existing installation
-- ---------------------------------------------------------------------------
INSERT INTO tenants (
  name,
  slug,
  status,
  plan_code,
  subscription_status
) VALUES (
  'M2N Hotels',
  'm2n-hotels',
  'active',
  'lite',
  'active'
);

UPDATE hotels
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'm2n-hotels' LIMIT 1)
WHERE tenant_id IS NULL;

INSERT INTO tenant_memberships (tenant_id, admin_user_id, membership_role, is_active)
SELECT
  t.id,
  au.id,
  'owner',
  TRUE
FROM tenants t
CROSS JOIN admin_users au
WHERE t.slug = 'm2n-hotels'
  AND au.is_active = TRUE
ON CONFLICT (tenant_id, admin_user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Enforce NOT NULL + FK + indexes on hotels.tenant_id
-- ---------------------------------------------------------------------------
ALTER TABLE hotels
  ADD CONSTRAINT hotels_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE RESTRICT;

CREATE INDEX idx_hotels_tenant_id ON hotels (tenant_id);
CREATE INDEX idx_hotels_tenant_status ON hotels (tenant_id, status);

ALTER TABLE hotels
  ALTER COLUMN tenant_id SET NOT NULL;
