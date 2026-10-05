CREATE TABLE IF NOT EXISTS schema_migrations (
  id          TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT UNIQUE,
  name          TEXT NOT NULL,
  email         TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS workers_email_key ON workers (email);

CREATE TABLE IF NOT EXISTS attendance_days (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id            UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  attendance_day       DATE NOT NULL,
  check_in_at          TIMESTAMPTZ NOT NULL,
  check_in_method      TEXT NOT NULL,
  check_in_ip          TEXT,
  check_in_lat         DOUBLE PRECISION,
  check_in_lng         DOUBLE PRECISION,
  check_in_distance_m  DOUBLE PRECISION,
  check_out_at         TIMESTAMPTZ,
  check_out_method     TEXT,
  check_out_ip         TEXT,
  check_out_lat        DOUBLE PRECISION,
  check_out_lng        DOUBLE PRECISION,
  check_out_distance_m DOUBLE PRECISION,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (worker_id, attendance_day)
);

CREATE INDEX IF NOT EXISTS attendance_days_day_idx ON attendance_days (attendance_day);
CREATE INDEX IF NOT EXISTS attendance_days_worker_idx ON attendance_days (worker_id, attendance_day);

CREATE TABLE IF NOT EXISTS attendance_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_day_id   UUID NOT NULL REFERENCES attendance_days(id) ON DELETE CASCADE,
  worker_id           UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,
  occurred_at         TIMESTAMPTZ NOT NULL,
  verification_method TEXT NOT NULL,
  client_ip           TEXT,
  lat                 DOUBLE PRECISION,
  lng                 DOUBLE PRECISION,
  distance_m          DOUBLE PRECISION,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS attendance_events_worker_time_idx ON attendance_events (worker_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS attendance_events_time_idx ON attendance_events (occurred_at DESC);

CREATE TABLE IF NOT EXISTS sites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  address       TEXT,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  radius_m      DOUBLE PRECISION NOT NULL DEFAULT 100,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sites_active_idx
  ON sites (active)
  WHERE active;

ALTER TABLE attendance_days
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

ALTER TABLE attendance_events
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS attendance_days_site_idx
  ON attendance_days (site_id)
  WHERE site_id IS NOT NULL;
