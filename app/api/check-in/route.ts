import { NextResponse } from "next/server";
import { requireWorker, isResponse } from "@/lib/session";
import { getOfficeConfig, welcomeMessage } from "@/lib/env";
import { getClientIp, parseGps, verifyAttendance } from "@/lib/verification";
import {
  getDb,
  getTodayAttendance,
  upsertWorkerByEmail,
} from "@/lib/workers";
import type { AttendanceActionBody, VerificationMethod } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorJson(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export async function POST(request: Request) {
  try {
    const user = await requireWorker();
    if (isResponse(user)) return user;

    const body = (await request.json().catch(() => ({}))) as {
      gps?: unknown;
    };

    const gps = parseGps(body.gps);
    if (!gps) {
      return errorJson(
        400,
        "LOCATION_REQUIRED",
        "Location access is required to check in. Allow location and try again.",
      );
    }

    const clientIp = getClientIp(request.headers);
    const verification = verifyAttendance(clientIp, gps);
    if (!verification.ok) {
      return errorJson(422, "NOT_VERIFIED", verification.reason);
    }

    const method: VerificationMethod = verification.method;
    const office = getOfficeConfig();
    const db = getDb();
    const occurredAt = new Date().toISOString();

    const worker = await upsertWorkerByEmail(user.email, user.name);
    if (!worker.active) {
      return errorJson(409, "INACTIVE_WORKER", "Worker is deactivated");
    }

    const { day: attendanceDay, row: existingDay } = await getTodayAttendance(
      worker.id,
    );

    if (existingDay?.check_in_at && !existingDay.check_out_at) {
      return errorJson(
        409,
        "ALREADY_CHECKED_IN",
        "You have already checked in today. Check out first.",
      );
    }
    if (existingDay?.check_in_at && existingDay.check_out_at) {
      return errorJson(
        409,
        "ALREADY_CHECKED_IN",
        "Attendance for today is already closed.",
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
        return errorJson(
          409,
          "ALREADY_CHECKED_IN",
          "You have already checked in today.",
        );
      }
      attendanceId = inserted[0].id;
    } else {
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

    const responseBody: AttendanceActionBody = {
      ok: true,
      action: "check_in",
      worker: {
        id: worker.id,
        name: worker.name,
        email: worker.email,
      },
      office: {
        name: office.name,
        city: office.city,
      },
      attendance: {
        attendanceDay,
        at: occurredAt,
        method,
        distanceMeters:
          verification.distanceM === null
            ? null
            : Math.round(verification.distanceM),
      },
      message: welcomeMessage(worker.name),
    };

    return NextResponse.json(responseBody, { status: 201 });
  } catch (err) {
    console.error("check-in error", err);
    return errorJson(500, "INTERNAL", "Internal Server Error");
  }
}
