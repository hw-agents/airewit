-- Migration 005: Create guests table
-- UP
BEGIN;

CREATE TYPE rsvp_status        AS ENUM ('pending', 'confirmed', 'declined');
CREATE TYPE relationship_group AS ENUM ('family_bride', 'family_groom', 'friends', 'work', 'community', 'other');
CREATE TYPE dietary_preference AS ENUM ('none', 'vegetarian', 'vegan', 'kosher_regular', 'kosher_mehadrin');
CREATE TYPE guest_source       AS ENUM ('registered', 'walkin');  -- Phase 2: analytics

CREATE TABLE guests (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id             UUID         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  -- Name (Hebrew required; Latin transliteration for non-Hebrew speakers)
  name_hebrew          VARCHAR(255) NOT NULL,
  name_transliteration VARCHAR(255),
  -- Contact (Israeli E.164 phone format: +972XXXXXXXXX)
  email                VARCHAR(255),
  phone                VARCHAR(20),
  -- RSVP
  rsvp_status          rsvp_status  NOT NULL DEFAULT 'pending',
  -- Seating
  table_number         INTEGER,
  seat_number          VARCHAR(10),
  -- Social grouping
  relationship_group   relationship_group,
  plus_one_of          UUID         REFERENCES guests(id) ON DELETE SET NULL,  -- self-ref FK
  plus_one_allowance   INTEGER      NOT NULL DEFAULT 0,
  -- Preferences
  dietary_preference   dietary_preference NOT NULL DEFAULT 'none',
  dietary_notes        TEXT,                     -- free-text override/additions
  accessibility_needs  TEXT,
  -- Phase 2: Day-of check-in
  source               guest_source NOT NULL DEFAULT 'registered',  -- analytics (walk-ins vs pre-registered)
  -- Israeli Privacy Law 2023 compliance
  privacy_accepted_at  TIMESTAMPTZ,
  -- NO deleted_at: guests support hard delete only (data subject right per Israeli Privacy Law)
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guests_event_id      ON guests(event_id);
CREATE INDEX idx_guests_rsvp_status   ON guests(rsvp_status);
CREATE INDEX idx_guests_plus_one_of   ON guests(plus_one_of);
-- pg_trgm GIN index for Phase 2 fuzzy Hebrew name search (requires pg_trgm from migration 001)
CREATE INDEX idx_guests_name_trgm     ON guests USING GIN(name_hebrew gin_trgm_ops);

COMMIT;

-- DOWN
-- BEGIN;
-- DROP TABLE IF EXISTS guests;
-- DROP TYPE IF EXISTS guest_source;
-- DROP TYPE IF EXISTS dietary_preference;
-- DROP TYPE IF EXISTS relationship_group;
-- DROP TYPE IF EXISTS rsvp_status;
-- COMMIT;
