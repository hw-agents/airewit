-- Migration 002: Create users table
-- UP
BEGIN;

CREATE TYPE user_role AS ENUM ('organizer', 'vendor', 'admin');

CREATE TABLE users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  display_name    VARCHAR(255) NOT NULL,
  role            user_role   NOT NULL DEFAULT 'organizer',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

COMMIT;

-- DOWN
-- BEGIN;
-- DROP TABLE IF EXISTS users;
-- DROP TYPE IF EXISTS user_role;
-- COMMIT;
