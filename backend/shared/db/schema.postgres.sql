-- Zestify Postgres schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'attendee' CHECK (role IN ('attendee','organizer','admin')),
  avatar TEXT,
  bio TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT '📌',
  color TEXT DEFAULT '#7c3aed',
  description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT DEFAULT '',
  date TEXT NOT NULL,
  end_date TEXT,
  time TEXT NOT NULL,
  end_time TEXT,
  location TEXT NOT NULL,
  venue_name TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  zip TEXT DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_online BOOLEAN DEFAULT FALSE,
  online_url TEXT DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 100,
  tickets_sold INTEGER DEFAULT 0,
  price DOUBLE PRECISION DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  image TEXT,
  organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','completed')),
  is_featured BOOLEAN DEFAULT FALSE,
  tags TEXT DEFAULT '',
  schedule JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  ticket_code TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  total_price DOUBLE PRECISION DEFAULT 0,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','attended','refunded')),
  payment_method TEXT DEFAULT 'free',
  payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending','completed','refunded')),
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_ticket
  ON tickets (user_id, event_id)
  WHERE status != 'cancelled';

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','error','event_reminder','ticket_confirmation','event_approved','event_rejected')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('event','user')),
  target_id INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_search ON events USING GIN (to_tsvector('english', title || ' ' || description || ' ' || COALESCE(tags,'')));
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Idempotent migrations (safe to run repeatedly on existing schema)
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('info','success','warning','error','event_reminder','ticket_confirmation','event_approved','event_rejected','event_cancelled','event_rescheduled','ticket_cancelled'));

-- Demo accounts — team member emails wired into seed users (idempotent).
-- Drop any test user that pre-claimed the SJSU email so the organizer seed can take it.
DELETE FROM tickets WHERE user_id IN (SELECT id FROM users WHERE email = 'nihardharmeshkumar.patel@sjsu.edu' AND name = 'Nihar Tester');
DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email = 'nihardharmeshkumar.patel@sjsu.edu' AND name = 'Nihar Tester');
DELETE FROM users WHERE email = 'nihardharmeshkumar.patel@sjsu.edu' AND name = 'Nihar Tester';
UPDATE users SET email = 'kalharpatel10@gmail.com' WHERE email = 'admin@zestify.com';
-- Nihar = organizer demo, Soham = attendee demo (Kalhar = admin demo)
UPDATE users SET email = 'nihardharmeshkumar.patel@sjsu.edu' WHERE email = 'elena@zestify.com';
UPDATE users SET email = 'sohamrajjain0007@gmail.com' WHERE email = 'alex@zestify.com';
-- Rename to team member display names.
UPDATE users SET name = 'Kalhar Patel'   WHERE email = 'kalharpatel10@gmail.com';
UPDATE users SET name = 'Nihar Patel'    WHERE email = 'nihardharmeshkumar.patel@sjsu.edu';
UPDATE users SET name = 'Soham Raj Jain' WHERE email = 'sohamrajjain0007@gmail.com';

-- Team accounts: password = email.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
UPDATE users SET password = crypt('kalharpatel10@gmail.com', gen_salt('bf', 10))
  WHERE email = 'kalharpatel10@gmail.com';
UPDATE users SET password = crypt('nihardharmeshkumar.patel@sjsu.edu', gen_salt('bf', 10))
  WHERE email = 'nihardharmeshkumar.patel@sjsu.edu';
UPDATE users SET password = crypt('sohamrajjain0007@gmail.com', gen_salt('bf', 10))
  WHERE email = 'sohamrajjain0007@gmail.com';

-- Defensive role correction — covers prod DBs that ran the OLD mapping where
-- Soham got the organizer slot and Nihar got the attendee slot.
DO $$
DECLARE
  nihar_id INT;
  soham_id INT;
  nihar_role TEXT;
  soham_role TEXT;
BEGIN
  SELECT id, role INTO nihar_id, nihar_role FROM users WHERE email = 'nihardharmeshkumar.patel@sjsu.edu';
  SELECT id, role INTO soham_id, soham_role FROM users WHERE email = 'sohamrajjain0007@gmail.com';
  IF nihar_id IS NOT NULL AND soham_id IS NOT NULL
     AND nihar_role = 'attendee' AND soham_role = 'organizer' THEN
    UPDATE users SET email = 'temp-swap-1@zestify.local' WHERE id = nihar_id;
    UPDATE users SET email = 'nihardharmeshkumar.patel@sjsu.edu' WHERE id = soham_id;
    UPDATE users SET email = 'sohamrajjain0007@gmail.com' WHERE id = nihar_id;
    UPDATE users SET name = 'Nihar Patel'    WHERE id = soham_id;
    UPDATE users SET name = 'Soham Raj Jain' WHERE id = nihar_id;
  END IF;
END $$;

-- Repair events.tickets_sold drift — authoritative recompute from tickets table.
-- Safe to run at every container start; idempotent UPDATE.
UPDATE events e
SET tickets_sold = COALESCE((
  SELECT SUM(quantity) FROM tickets t
  WHERE t.event_id = e.id AND t.status = 'confirmed'
), 0);
