import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { officeDayKey } from "@/lib/attendance-day";
import { getClientIp, parseGps, verifyAttendance } from "@/lib/verification";
import type {
  ApiErrorBody,
  CheckInSuccessBody,
  VerificationMethod,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorJson(status: number, error: string, message: string) {
  return NextResponse.json({ error, message } satisfies ApiErrorBody, { status });
}

function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  if (!code) return null;
  return code;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      employeeCode?: unknown;
      name?: unknown;
      gps?: unknown;
    };

    const employeeCode = normalizeCode(body.employeeCode);
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!employeeCode) {
      return errorJson(400, "INVALID_INPUT", "Employee code is required");
    }
    if (!name) {
      return errorJson(400, "INVALID_INPUT", "Name is required for check-in");
    }

    const gps = parseGps(body.gps);
    const clientIp = getClientIp(request.headers);
    const verification = verifyAttendance(clientIp, gps);

    if (!verification.ok) {
      return errorJson(422, "NOT_VERIFIED", verification.reason);
    }

    const method: VerificationMethod = verification.method;
    const attendanceDay = officeDayKey();
    const occurredAt = new Date().toISOString();

    // Find existing worker
    const existing = await db.sql<{
      id: string;
      employee_code: string;
      name: string;
      active: boolean;
    }>`SELECT id, employee_code, name, active FROM workers WHERE employee_code = ${employeeCode}`;

    let worker = existing[0];
    let createdWorker = false;

    if (!worker) {
      const inserted = await db.sql<{
        id: string;
        employee_code: string;
        name: string;
        active: boolean;
      }>`
        INSERT INTO workers (employee_code, name, active)
        VALUES (${employeeCode}, ${name}, TRUE)
        RETURNING id, employee_code, name, active
      `;
      worker = inserted[0]!;
      createdWorker = true;
    } else if (!worker.active) {
      return errorJson(409, "INACTIVE_WORKER", "Worker is deactivated");
    } else if (worker.name !== name) {
      // Update name only after successful verification
      const updated = await db.sql<{ name: string }>`
        UPDATE workers SET name = ${name}, updated_at = NOW()
        WHERE id = ${worker.id}
        RETURNING name
      `;
      worker = { ...worker, name: updated[0]!.name };
    }

    // Check for existing attendance today
    const todayRows = await db.sql<{
      id: string;
      check_in_at: string | null;
      check_out_at: string | null;
    }>`
      SELECT id, check_in_at, check_out_at
      FROM attendance_days
      WHERE worker_id = ${worker.id} AND attendance_day = ${attendanceDay}::date
    `;

    const existingDay = todayRows[0];
    if (existingDay && existingDay.check_in_at && !existingDay.check_out_at) {
      return errorJson(
        409,
        "ALREADY_CHECKED_IN",
        "You have already checked in today. Check out first.",
      );
    }
    if (existingDay && existingDay.check_in_at && existingDay.check_out_at) {
      // Already fully closed — reject re-check-in same day
      return errorJson(
        409,
        "ALREADY_CHECKED_IN",
        "Attendance for today is already closed. Check-out then re-check-in is not allowed after close.",
      );
    }

    let attendanceId: string;
    if (!existingDay) {
      const inserted = await db.sql<{ id: string }>`
        INSERT INTO attendance_days (
          worker_id,
          attendance_day,
          check_in_at,
          check_in_method,
          check_in_ip,
          check_in_lat,
          check_in_lng,
          check_in_distance_m
        ) VALUES (
          ${worker.id},
          ${attendanceDay}::date,
          ${occurredAt}::timestamptz,
          ${method},
          ${clientIp},
          ${verification.lat},
          ${verification.lng},
          ${verification.distanceM}
        )
        ON CONFLICT (worker_id, attendance_day) DO NOTHING
        RETURNING id
      `;
      if (!inserted[0]) {
        // Lost race — re-read
        const again = await db.sql<{ id: string; check_in_at: string }>`
          SELECT id, check_in_at FROM attendance_days
          WHERE worker_id = ${worker.id} AND attendance_day = ${attendanceDay}::date
        `;
        const row = again[0];
        if (row?.check_in_at) {
          return errorJson(409, "ALREADY_CHECKED_IN", "You have already checked in today.");
        }
        return errorJson(409, "ALREADY_CHECKED_IN", "Conflict creating attendance record.");
      }
      attendanceId = inserted[0].id;
    } else {
      // existingDay without check_in_at shouldn't happen (NOT NULL), but handle safely
      attendanceId = existingDay.id;
      await db.sql`
        UPDATE attendance_days
        SET check_in_at = ${occurredAt}::timestamptz,
            check_in_method = ${method},
            check_in_ip = ${clientIp},
            check_in_lat = ${verification.lat},
            check_in_lng = ${verification.lng},
            check_in_distance_m = ${verification.distanceM},
            updated_at = NOW()
        WHERE id = ${attendanceId}
      `;
    }

    await db.sql`
      INSERT INTO attendance_events (
        attendance_day_id,
        worker_id,
        event_type,
        occurred_at,
        verification_method,
        client_ip,
        lat,
        lng,
        distance_m
      ) VALUES (
        ${attendanceId},
        ${worker.id},
        'check_in',
        ${occurredAt}::timestamptz,
        ${method},
        ${clientIp},
        ${verification.lat},
        ${verification.lng},
        ${verification.distanceM}
      )
    `;

    // Silence unused variable warning path for createdWorker if needed later
    void createdWorker;

    const responseBody: CheckInSuccessBody = {
      ok: true,
      action: "check_in",
      worker: {
        id: worker.id,
        employeeCode: worker.employee_code,
        name: worker.name,
      },
      attendance: {
        attendanceDay,
        checkInAt: occurredAt,
        method,
        distanceMeters:
          verification.distanceM === null ? null : Math.round(verification.distanceM),
      },
    };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (err) {
    console.error("check-in error", err);
    return errorJson(500, "INTERNAL", "Internal Server Error");
  }
}
