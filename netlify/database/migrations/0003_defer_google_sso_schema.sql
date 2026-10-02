-- Defensive schema fix for Google SSO + check-in (idempotent)

-- 1) workers.email
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2) Unique email for ON CONFLICT / lookups (Postgres allows multiple NULLs)
DROP INDEX IF EXISTS workers_email_unique_idx;
DROP INDEX IF EXISTS workers_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS workers_email_key
  ON workers (email);

-- 3) employee_code optional + not unique-blocking (display only)
ALTER TABLE workers
  ALTER COLUMN employee_code DROP NOT NULL;

DROP INDEX IF EXISTS workers_employee_code_key;

-- 4) Ensure attendance tables exist even if 0001 was skipped
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

CREATE INDEX IF NOT EXISTS attendance_days_day_idx ON attendance_days (attendance_day);
CREATE INDEX IF NOT EXISTS attendance_days_worker_idx ON attendance_days (worker_id, attendance_day);
CREATE INDEX IF NOT EXISTS attendance_events_worker_time_idx ON attendance_events (worker_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS attendance_events_time_idx ON attendance_events (occurred_at DESC);
