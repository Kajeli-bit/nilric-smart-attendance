import { NextResponse } from "next/server";
import { requireWorker, isResponse } from "@/lib/session";
import { getOfficeConfig, goodbyeMessage } from "@/lib/env";
import {
  getClientIp,
  parseGps,
  parseSiteId,
  verifyAttendance,
} from "@/lib/verification";
import {
  getDb,
  findWorkerByEmail,
  getTodayAttendance,
} from "@/lib/workers";
import { getActiveSiteById } from "@/lib/sites";
import { dbErrorResponse } from "@/lib/db-errors";
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
      siteId?: unknown;
    };

    const gps = parseGps(body.gps);
    if (!gps) {
      return errorJson(
        400,
        "LOCATION_REQUIRED",
        "Location access is required to check out. Allow location and try again.",
      );
    }

    const worker = await findWorkerByEmail(user.email);
    if (!worker) {
      return errorJson(
        404,
        "WORKER_NOT_FOUND",
        "No worker record found. Please check in first.",
      );
    }
    if (!worker.active) {
      return errorJson(409, "INACTIVE_WORKER", "Worker is deactivated");
    }

    const { day: attendanceDay, row: day } = await getTodayAttendance(
      worker.id,
    );

    if (!day?.check_in_at) {
      return errorJson(
        409,
        "NOT_CHECKED_IN",
        "No check-in found for today. Check in first.",
      );
    }
    if (day.check_out_at) {
      return errorJson(
        409,
        "ALREADY_CHECKED_OUT",
        "You have already checked out today.",
      );
    }

    // Prefer explicit selection; otherwise reuse site from today's check-in
    const selectedSiteId = parseSiteId(body.siteId);
    const priorSiteId = day.site_id ?? null;
    const requestSiteId = selectedSiteId ?? priorSiteId;

    let siteName: string | null = null;
    if (requestSiteId) {
      const site = await getActiveSiteById(requestSiteId);
      if (!site) {
        return errorJson(
          422,
          "SITE_UNAVAILABLE",
          "Selected site is unavailable. Choose HQ or another active site.",
        );
      }
      siteName = site.name;
    }

    const clientIp = getClientIp(request.headers);
    const verification = await verifyAttendance(
      clientIp,
      gps,
      getOfficeConfig(),
      requestSiteId,
    );
    if (!verification.ok) {
      return errorJson(
        422,
        verification.errorCode === "SITE_UNAVAILABLE"
          ? "SITE_UNAVAILABLE"
          : "NOT_VERIFIED",
        verification.reason,
      );
    }

    const method: VerificationMethod = verification.method;
    const office = getOfficeConfig();
    const db = getDb();
    const occurredAt = new Date().toISOString();
    const siteId = verification.siteId ?? requestSiteId ?? null;
    if (!siteName && verification.siteName) siteName = verification.siteName;

    const updated = await db.sql<{ check_out_at: string }>`
      UPDATE attendance_days
      SET check_out_at = ${occurredAt}::timestamptz,
          check_out_method = ${method},
          check_out_ip = ${clientIp},
          check_out_lat = ${verification.lat},
          check_out_lng = ${verification.lng},
          check_out_distance_m = ${verification.distanceM},
          site_id = ${siteId},
          updated_at = NOW()
      WHERE id = ${day.id} AND check_out_at IS NULL
      RETURNING check_out_at
    `;

    if (!updated[0]) {
      return errorJson(
        409,
        "ALREADY_CHECKED_OUT",
        "You have already checked out today.",
      );
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
        distance_m,
        site_id
      ) VALUES (
        ${day.id},
        ${worker.id},
        'check_out',
        ${occurredAt}::timestamptz,
        ${method},
        ${clientIp},
        ${verification.lat},
        ${verification.lng},
        ${verification.distanceM},
        ${siteId}
      )
    `;

    const responseBody: AttendanceActionBody = {
      ok: true,
      action: "check_out",
      worker: {
        id: worker.id,
        name: worker.name,
        email: worker.email,
      },
      office: {
        name: office.name,
        city: office.city,
      },
      site: siteId && siteName ? { id: siteId, name: siteName } : null,
      attendance: {
        attendanceDay,
        at: occurredAt,
        method,
        distanceMeters:
          verification.distanceM === null
            ? null
            : Math.round(verification.distanceM),
      },
      message: goodbyeMessage(worker.name),
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
