-- Google SSO: workers are identified by Google account email
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS workers_email_unique_idx
  ON workers (email)
  WHERE email IS NOT NULL;

-- employee_code becomes optional (display/admin only)
ALTER TABLE workers
  ALTER COLUMN employee_code DROP NOT NULL;

UPDATE workers
SET employee_code = NULL
WHERE employee_code IS NOT NULL
  AND email IS NOT NULL;
