-- Migration 006: Create bookings table
-- UP
BEGIN;

CREATE TYPE booking_status  AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE payment_status  AS ENUM ('unpaid', 'deposit_paid', 'fully_paid');  -- Phase 3: AI/financial

CREATE TABLE bookings (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID           NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  vendor_id       UUID           NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status          booking_status NOT NULL DEFAULT 'pending',
  agreed_price    DECIMAL(12, 2),
  notes           TEXT,
  -- Phase 3: AI recommendation & financial tracking
  contract_value  DECIMAL(12, 2),                -- actual signed contract value in NIS
  payment_status  payment_status NOT NULL DEFAULT 'unpaid',
  deleted_at      TIMESTAMPTZ,                   -- soft delete
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_event_id       ON bookings(event_id);
CREATE INDEX idx_bookings_vendor_id      ON bookings(vendor_id);
CREATE INDEX idx_bookings_status         ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);

COMMIT;

-- DOWN
-- BEGIN;
-- DROP TABLE IF EXISTS bookings;
-- DROP TYPE IF EXISTS payment_status;
-- DROP TYPE IF EXISTS booking_status;
-- COMMIT;
