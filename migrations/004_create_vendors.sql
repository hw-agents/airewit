-- Migration 004: Create vendors table
-- UP
BEGIN;

CREATE TYPE vendor_category AS ENUM (
  'catering', 'photography', 'videographer', 'music', 'decoration',
  'venue', 'officiant', 'staffing', 'transportation', 'printing',
  'entertainment', 'other'
);

CREATE TABLE vendors (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name             VARCHAR(255) NOT NULL,
  category                  vendor_category NOT NULL,
  description               TEXT,
  base_price                DECIMAL(12, 2),
  city                      VARCHAR(100),
  is_verified               BOOLEAN      NOT NULL DEFAULT FALSE,
  -- Israeli compliance & certification fields
  kashrut_cert_number       VARCHAR(100),
  kashrut_issuing_authority VARCHAR(255),
  business_license_number   VARCHAR(100),
  license_expiry_date       DATE,                  -- alert when within 30 days of expiry
  insurance_ref             VARCHAR(255),
  -- Phase 3: AI recommendation fields
  geographic_area           VARCHAR(255),          -- broader area (e.g. "North", "Tel Aviv District")
  price_range_min           DECIMAL(12, 2),        -- NIS
  price_range_max           DECIMAL(12, 2),        -- NIS
  capacity_min              INTEGER,
  capacity_max              INTEGER,
  style_tags                TEXT[],                -- e.g. {"rustic","modern","religious"}
  deleted_at                TIMESTAMPTZ,           -- soft delete
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendors_user_id       ON vendors(user_id);
CREATE INDEX idx_vendors_category      ON vendors(category);
CREATE INDEX idx_vendors_city          ON vendors(city);
CREATE INDEX idx_vendors_geographic    ON vendors(geographic_area);
CREATE INDEX idx_vendors_style_tags    ON vendors USING GIN(style_tags);

COMMIT;

-- DOWN
-- BEGIN;
-- DROP TABLE IF EXISTS vendors;
-- DROP TYPE IF EXISTS vendor_category;
-- COMMIT;
