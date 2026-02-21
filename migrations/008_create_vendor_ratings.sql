-- Migration 008: Create vendor_ratings table (Phase 3: AI recommendation engine)
-- UP
BEGIN;

CREATE TABLE vendor_ratings (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id              UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  vendor_id             UUID        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  organizer_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 6-dimension rating system (1-5 scale)
  quality_score         SMALLINT    NOT NULL CHECK (quality_score BETWEEN 1 AND 5),
  professionalism_score SMALLINT    NOT NULL CHECK (professionalism_score BETWEEN 1 AND 5),
  flexibility_score     SMALLINT    NOT NULL CHECK (flexibility_score BETWEEN 1 AND 5),
  value_score           SMALLINT    NOT NULL CHECK (value_score BETWEEN 1 AND 5),
  -- Boolean recommendation signals
  would_use_again       BOOLEAN     NOT NULL,
  would_recommend       BOOLEAN     NOT NULL,
  -- Optional review text
  review_text           TEXT,
  rated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One rating per (event, vendor, organizer) tuple
  CONSTRAINT uq_vendor_rating UNIQUE (event_id, vendor_id, organizer_id)
);

CREATE INDEX idx_vendor_ratings_vendor_id    ON vendor_ratings(vendor_id);
CREATE INDEX idx_vendor_ratings_organizer_id ON vendor_ratings(organizer_id);
CREATE INDEX idx_vendor_ratings_event_id     ON vendor_ratings(event_id);

COMMIT;

-- DOWN
-- BEGIN;
-- DROP TABLE IF EXISTS vendor_ratings;
-- COMMIT;
