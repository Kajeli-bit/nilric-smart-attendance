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
-- 0005 v1 platform: employees module + attendance record state (Odoo-inspired)

-- Employees: the shared HR backbone for roles, departments and managers.
CREATE TABLE IF NOT EXISTS employees (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code  TEXT UNIQUE,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  role           TEXT NOT NULL DEFAULT 'worker'
                 CHECK (role IN ('worker','hr','accountant','marketing','director')),
  department     TEXT,
  job_title      TEXT,
  manager_id     UUID REFERENCES employees(id) ON DELETE SET NULL,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employees_department_idx ON employees (department);
CREATE INDEX IF NOT EXISTS employees_role_idx ON employees (role);
CREATE INDEX IF NOT EXISTS employees_manager_idx ON employees (manager_id);

-- Attendance record state, Odoo-style: open -> closed, corrections by HR.
ALTER TABLE attendance_days
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'open'
    CHECK (state IN ('open', 'closed', 'corrected'));

ALTER TABLE attendance_days
  ADD COLUMN IF NOT EXISTS correction_notes TEXT;

ALTER TABLE attendance_days
  ADD COLUMN IF NOT EXISTS corrected_by_email TEXT;

ALTER TABLE attendance_days
  ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS attendance_days_state_idx ON attendance_days (state);
-- 0006 time off + recruitment modules (Odoo-inspired)
-- Time Off: hr_holidays-style leave requests with an approval state machine.
-- Recruitment: hr_recruitment-style job positions and applicant pipeline.

-- ===== Time Off =====
CREATE TABLE IF NOT EXISTS leaves (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type     TEXT NOT NULL DEFAULT 'annual'
                 CHECK (leave_type IN ('annual','sick','unpaid','maternity','compassionate','other')),
  date_from      DATE NOT NULL,
  date_to        DATE NOT NULL,
  days           NUMERIC(5,1) NOT NULL DEFAULT 1,
  reason         TEXT,
  state          TEXT NOT NULL DEFAULT 'to_approve'
                 CHECK (state IN ('draft','to_approve','refused','validated')),
  approver_email TEXT,
  decided_at     TIMESTAMPTZ,
  decision_notes TEXT,
  created_by     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (date_to >= date_from)
);

CREATE INDEX IF NOT EXISTS leaves_employee_idx ON leaves (employee_id, date_from DESC);
CREATE INDEX IF NOT EXISTS leaves_state_idx ON leaves (state);
CREATE INDEX IF NOT EXISTS leaves_type_idx ON leaves (leave_type);

-- ===== Recruitment =====
CREATE TABLE IF NOT EXISTS job_positions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  department   TEXT,
  description  TEXT,
  state        TEXT NOT NULL DEFAULT 'open'
               CHECK (state IN ('open','recruited','closed')),
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_positions_state_idx ON job_positions (state);

CREATE TABLE IF NOT EXISTS job_applicants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  job_position_id UUID REFERENCES job_positions(id) ON DELETE SET NULL,
  stage           TEXT NOT NULL DEFAULT 'new'
                  CHECK (stage IN ('new','screening','first_interview','second_interview','contract','employed','refused')),
  rating          SMALLINT CHECK (rating BETWEEN 0 AND 3),
  notes           TEXT,
  hired_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_applicants_stage_idx ON job_applicants (stage);
CREATE INDEX IF NOT EXISTS job_applicants_position_idx ON job_applicants (job_position_id);
