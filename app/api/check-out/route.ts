import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { officeDayKey } from "@/lib/attendance-day";
import { getClientIp, parseGps, verifyAttendance } from "@/lib/verification";
import type {
  ApiErrorBody,
  CheckOutSuccessBody,
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
  return code || null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      employeeCode?: unknown;
      gps?: unknown;
    };

    const employeeCode = normalizeCode(body.employeeCode);
    if (!employeeCode) {
      return errorJson(400, "INVALID_INPUT", "Employee code is required");
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

    const workers = await db.sql<{
      id: string;
      employee_code: string;
      name: string;
      active: boolean;
    }>`SELECT id, employee_code, name, active FROM workers WHERE employee_code = ${employeeCode}`;

    const worker = workers[0];
    if (!worker) {
      return errorJson(404, "WORKER_NOT_FOUND", "Worker not found. Check in first.");
    }
    if (!worker.active) {
      return errorJson(409, "INACTIVE_WORKER", "Worker is deactivated");
    }

    const dayRows = await db.sql<{
      id: string;
      check_in_at: string;
      check_out_at: string | null;
    }>`
      SELECT id, check_in_at, check_out_at
      FROM attendance_days
      WHERE worker_id = ${worker.id} AND attendance_day = ${attendanceDay}::date
    `;

    const day = dayRows[0];
    if (!day) {
      return errorJson(
        409,
        "NOT_CHECKED_IN",
        "No check-in found for today. Check in first.",
      );
    }
    if (day.check_out_at) {
      return errorJson(409, "ALREADY_CHECKED_OUT", "You have already checked out today.");
    }

    const updated = await db.sql<{ check_out_at: string }>`
      UPDATE attendance_days
      SET check_out_at = ${occurredAt}::timestamptz,
          check_out_method = ${method},
          check_out_ip = ${clientIp},
          check_out_lat = ${verification.lat},
          check_out_lng = ${verification.lng},
          check_out_distance_m = ${verification.distanceM},
          updated_at = NOW()
      WHERE id = ${day.id} AND check_out_at IS NULL
      RETURNING check_out_at
    `;

    if (!updated[0]) {
      return errorJson(409, "ALREADY_CHECKED_OUT", "You have already checked out today.");
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
        ${day.id},
        ${worker.id},
        'check_out',
        ${occurredAt}::timestamptz,
        ${method},
        ${clientIp},
        ${verification.lat},
        ${verification.lng},
        ${verification.distanceM}
      )
    `;

    const responseBody: CheckOutSuccessBody = {
      ok: true,
      action: "check_out",
      worker: {
        id: worker.id,
        employeeCode: worker.employee_code,
        name: worker.name,
      },
      attendance: {
        attendanceDay,
        checkOutAt: occurredAt,
        method,
        distanceMeters:
          verification.distanceM === null ? null : Math.round(verification.distanceM),
      },
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error("check-out error", err);
    return errorJson(500, "INTERNAL", "Internal Server Error");
  }
}
