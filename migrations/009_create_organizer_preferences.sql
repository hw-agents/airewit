-- Migration 009: Create organizer_preferences table (Phase 3: AI recommendation engine)
-- UP
BEGIN;

CREATE TABLE organizer_preferences (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Style preferences (matches vendors.style_tags for AI matching)
  style_tags              TEXT[],                  -- e.g. {"rustic","modern","religious"}
  -- Typical event scale
  typical_guest_count_min INTEGER,
  typical_guest_count_max INTEGER,
  -- Typical budget range in NIS
  typical_budget_min      DECIMAL(12, 2),
  typical_budget_max      DECIMAL(12, 2),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One preference record per user
  CONSTRAINT uq_organizer_preferences_user UNIQUE (user_id)
);

CREATE INDEX idx_organizer_prefs_user_id    ON organizer_preferences(user_id);
CREATE INDEX idx_organizer_prefs_style_tags ON organizer_preferences USING GIN(style_tags);

COMMIT;

-- DOWN
-- BEGIN;
-- DROP TABLE IF EXISTS organizer_preferences;
-- COMMIT;
