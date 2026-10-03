-- Google SSO: workers identified by Google email
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS workers_email_unique_idx
  ON workers (email)
  WHERE email IS NOT NULL;

ALTER TABLE workers
  ALTER COLUMN employee_code DROP NOT NULL;

UPDATE workers
SET employee_code = NULL
WHERE employee_code IS NOT NULL
  AND email IS NOT NULL;
