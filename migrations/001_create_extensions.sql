-- Migration 001: Enable required PostgreSQL extensions
-- UP
BEGIN;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- required for Phase 2 fuzzy Hebrew name search
COMMIT;

-- DOWN
-- BEGIN;
-- DROP EXTENSION IF EXISTS "pg_trgm";
-- DROP EXTENSION IF EXISTS "pgcrypto";
-- COMMIT;
