-- Seed 001: Test data for development
-- Passwords are bcrypt hashes of 'Password123!' — replace at runtime with actual hash

BEGIN;

-- ─── Users ───────────────────────────────────────────────────────────────────

-- Test organizer
INSERT INTO users (id, email, password_hash, display_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111',
   'organizer@test.com',
   '$2b$10$REPLACE_WITH_REAL_HASH',
   'מארגן בדיקה',
   'organizer');

-- Vendor users (one per vendor profile below)
INSERT INTO users (id, email, password_hash, display_name, role) VALUES
  ('22222222-2222-2222-2222-222222222222', 'catering@test.com',      '$2b$10$REPLACE_WITH_REAL_HASH', 'קייטרינג לדוגמה',    'vendor'),
  ('22222222-2222-2222-2222-222222222223', 'photography@test.com',   '$2b$10$REPLACE_WITH_REAL_HASH', 'צלם לדוגמה',         'vendor'),
  ('22222222-2222-2222-2222-222222222224', 'music@test.com',         '$2b$10$REPLACE_WITH_REAL_HASH', 'מוזיקה לדוגמה',      'vendor'),
  ('22222222-2222-2222-2222-222222222225', 'decoration@test.com',    '$2b$10$REPLACE_WITH_REAL_HASH', 'עיצוב לדוגמה',       'vendor'),
  ('22222222-2222-2222-2222-222222222226', 'venue@test.com',         '$2b$10$REPLACE_WITH_REAL_HASH', 'אולם לדוגמה',        'vendor');

-- ─── Vendors (5 profiles across different categories) ────────────────────────

INSERT INTO vendors (id, user_id, business_name, category, city, geographic_area,
                     base_price, price_range_min, price_range_max,
                     capacity_min, capacity_max,
                     style_tags, is_verified) VALUES
  ('33333333-3333-3333-3333-333333333331',
   '22222222-2222-2222-2222-222222222222',
   'קייטרינג שף אורי', 'catering', 'תל אביב', 'מרכז',
   5000.00, 4000.00, 12000.00, 50, 500,
   ARRAY['kosher_mehadrin', 'modern'], TRUE),

  ('33333333-3333-3333-3333-333333333332',
   '22222222-2222-2222-2222-222222222223',
   'סטודיו לכידת רגעים', 'photography', 'ירושלים', 'ירושלים וסביבותיה',
   3000.00, 2500.00, 8000.00, 30, 600,
   ARRAY['traditional', 'religious'], TRUE),

  ('33333333-3333-3333-3333-333333333333',
   '22222222-2222-2222-2222-222222222224',
   'להקת הכוכבים', 'music', 'חיפה', 'צפון',
   4000.00, 3000.00, 10000.00, 100, 800,
   ARRAY['modern', 'mizrahi'], FALSE),

  ('33333333-3333-3333-3333-333333333334',
   '22222222-2222-2222-2222-222222222225',
   'עיצוב ואווירה', 'decoration', 'ראשון לציון', 'מרכז',
   2000.00, 1500.00, 6000.00, 20, 400,
   ARRAY['rustic', 'romantic', 'modern'], TRUE),

  ('33333333-3333-3333-3333-333333333335',
   '22222222-2222-2222-2222-222222222226',
   'אולם הנשיאים', 'venue', 'נתניה', 'שרון',
   15000.00, 10000.00, 35000.00, 80, 700,
   ARRAY['elegant', 'modern'], TRUE);

-- ─── Sample Event ─────────────────────────────────────────────────────────────

INSERT INTO events (id, organizer_id, title, description, event_date,
                    venue_name, max_guests, venue_capacity,
                    status, kashrut_level, noise_curfew_time,
                    max_plus_ones_buffer, retention_policy_days, language_pref) VALUES
  ('44444444-4444-4444-4444-444444444444',
   '11111111-1111-1111-1111-111111111111',
   'חתונת בדיקה',
   'אירוע לדוגמה לפיתוח',
   NOW() + INTERVAL '30 days',
   'אולם הנשיאים', 150, 200,
   'draft', 'mehadrin', '23:00',
   30, 365, 'hebrew');

-- ─── Sample Guests ────────────────────────────────────────────────────────────

INSERT INTO guests (event_id, name_hebrew, name_transliteration, email, phone,
                    rsvp_status, relationship_group, dietary_preference,
                    plus_one_allowance, source, privacy_accepted_at) VALUES
  ('44444444-4444-4444-4444-444444444444',
   'יוסי כהן', 'Yossi Cohen', 'yossi@test.com', '+972501234567',
   'pending', 'family_groom', 'kosher_mehadrin', 1, 'registered', NOW()),

  ('44444444-4444-4444-4444-444444444444',
   'מיכל לוי', 'Michal Levi', 'michal@test.com', '+972521234567',
   'confirmed', 'friends', 'vegetarian', 0, 'registered', NOW()),

  ('44444444-4444-4444-4444-444444444444',
   'דוד ישראלי', 'David Israeli', 'david@test.com', '+972541234567',
   'declined', 'work', 'none', 0, 'registered', NOW());

COMMIT;
