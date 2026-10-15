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
