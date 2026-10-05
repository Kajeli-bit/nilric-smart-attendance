import { getOfficeConfig } from "@/lib/env";
import { db } from "@/lib/db";
import type { Worker } from "@/lib/types";

export function getDb() {
  return db;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function displayNameFromEmail(
  email: string,
  fallbackName?: string | null,
): string {
  if (fallbackName && fallbackName.trim()) return fallbackName.trim();
  const local = email.split("@")[0] ?? email;
  return (
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || email
  );
}

export function employeeCodeFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const cleaned = local.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EMP-${cleaned || "WORKER"}-${suffix}`;
}

export async function findWorkerByEmail(email: string): Promise<Worker | null> {
  const dbi = getDb();
  const rows = await dbi.sql<Worker>`
    SELECT id, employee_code, name, email, active, created_at, updated_at
    FROM workers
    WHERE email = ${normalizeEmail(email)}
  `;
  return rows[0] ?? null;
}

export async function upsertWorkerByEmail(
  email: string,
  displayName?: string | null,
): Promise<Worker> {
  const dbi = getDb();
  const normalized = normalizeEmail(email);
  const name = displayNameFromEmail(normalized, displayName);

  const existing = await findWorkerByEmail(normalized);
  if (existing) {
    if (!existing.name?.trim() && name) {
      const updated = await dbi.sql<Worker>`
        UPDATE workers SET name = ${name}, updated_at = NOW()
        WHERE id = ${existing.id}
        RETURNING id, employee_code, name, email, active, created_at, updated_at
      `;
      return updated[0] ?? existing;
    }
    return existing;
  }

  try {
    const inserted = await dbi.sql<Worker>`
      INSERT INTO workers (email, name, employee_code, active)
      VALUES (${normalized}, ${name}, ${employeeCodeFromEmail(normalized)}, TRUE)
      RETURNING id, employee_code, name, email, active, created_at, updated_at
    `;
    if (!inserted[0]) {
      const again = await findWorkerByEmail(normalized);
      if (again) return again;
      throw new Error("Worker insert returned no row");
    }
    return inserted[0];
  } catch (err) {
    // Unique email race: another request created the worker first
    const again = await findWorkerByEmail(normalized);
    if (again) return again;
    throw err;
  }
}

export async function getTodayAttendance(workerId: string) {
  const dbi = getDb();
  const office = getOfficeConfig();
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: office.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const rows = await dbi.sql<{
    id: string;
    attendance_day: string;
    check_in_at: string | null;
    check_out_at: string | null;
    check_in_method: string | null;
    check_out_method: string | null;
    site_id: string | null;
  }>`
    SELECT id, attendance_day, check_in_at, check_out_at, check_in_method, check_out_method, site_id
    FROM attendance_days
    WHERE worker_id = ${workerId} AND attendance_day = ${day}::date
  `;
  return { day, row: rows[0] ?? null };
}
