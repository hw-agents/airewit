-- Migration 003: Create events table
-- UP
BEGIN;

CREATE TYPE event_status   AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE kashrut_level  AS ENUM ('none', 'regular', 'mehadrin', 'chalav_yisrael');
CREATE TYPE event_language AS ENUM ('hebrew', 'arabic', 'english');

CREATE TABLE events (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                VARCHAR(255) NOT NULL,
  description          TEXT,
  event_date           TIMESTAMPTZ,
  venue_name           VARCHAR(255),
  venue_address        TEXT,
  max_guests           INTEGER,
  venue_capacity       INTEGER,                          -- fire-safety hard limit
  max_plus_ones_buffer INTEGER      NOT NULL DEFAULT 30, -- % buffer for walk-ins
  status               event_status NOT NULL DEFAULT 'draft',
  kashrut_level        kashrut_level NOT NULL DEFAULT 'none',
  noise_curfew_time    TIME         NOT NULL DEFAULT '23:00',  -- Israeli law default
  language_pref        event_language NOT NULL DEFAULT 'hebrew',
  budget               DECIMAL(12, 2),
  retention_policy_days INTEGER     NOT NULL DEFAULT 365, -- Israeli Privacy Law 2023
  deleted_at           TIMESTAMPTZ,                       -- soft delete for organizer use
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_status       ON events(status);
CREATE INDEX idx_events_event_date   ON events(event_date);

COMMIT;

-- DOWN
-- BEGIN;
-- DROP TABLE IF EXISTS events;
-- DROP TYPE IF EXISTS event_language;
-- DROP TYPE IF EXISTS kashrut_level;
-- DROP TYPE IF EXISTS event_status;
-- COMMIT;
