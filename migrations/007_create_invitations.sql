-- Migration 007: Create invitations table
-- UP
BEGIN;

CREATE TYPE invitation_channel AS ENUM ('sms', 'whatsapp', 'email');

CREATE TABLE invitations (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id    UUID         NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  token       VARCHAR(128) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(64), 'hex'),
  channel     invitation_channel NOT NULL DEFAULT 'whatsapp',
  -- MVP: wa.me deep-link (no Twilio/API required)
  -- Format: https://wa.me/+972XXXXXXXXX?text=ENCODED_MESSAGE
  whatsapp_link TEXT,                -- pre-generated deep-link for organizer to click
  sent_at     TIMESTAMPTZ,           -- when organizer clicked Send
  opened_at   TIMESTAMPTZ,           -- when guest opened the RSVP link
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_event_id ON invitations(event_id);
CREATE INDEX idx_invitations_guest_id ON invitations(guest_id);
CREATE INDEX idx_invitations_token    ON invitations(token);

COMMIT;

-- DOWN
-- BEGIN;
-- DROP TABLE IF EXISTS invitations;
-- DROP TYPE IF EXISTS invitation_channel;
-- COMMIT;
