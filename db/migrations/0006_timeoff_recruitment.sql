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
