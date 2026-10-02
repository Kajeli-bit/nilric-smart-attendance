CREATE TABLE workers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE attendance_days (
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

CREATE INDEX attendance_days_day_idx ON attendance_days (attendance_day);
CREATE INDEX attendance_days_worker_idx ON attendance_days (worker_id, attendance_day);

CREATE TABLE attendance_events (
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

CREATE INDEX attendance_events_worker_time_idx ON attendance_events (worker_id, occurred_at DESC);
CREATE INDEX attendance_events_time_idx ON attendance_events (occurred_at DESC);
