import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isGateResponse, requireCapability } from "@/lib/platform";
import { badRequest, notFound, internalError } from "@/lib/server-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/attendance/[id] — Odoo-style attendance record detail
 * with the underlying worker, employee enrichment and raw events.
 * Capability: attendance.view
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability("attendance.view");
  if (isGateResponse(gate)) return gate;

  const { id } = await params;
  try {
    const rows = await db.sql`
      SELECT
        ad.*,
        w.name AS worker_name,
        w.email AS worker_email,
        w.employee_code,
        e.name AS employee_name,
        e.role AS employee_role,
        e.department AS employee_department,
        s.name AS site_name
      FROM attendance_days ad
      JOIN workers w ON w.id = ad.worker_id
      LEFT JOIN employees e ON e.email = w.email AND e.active = TRUE
      LEFT JOIN sites s ON s.id = ad.site_id
      WHERE ad.id = ${id}::uuid
    `;
    if (!rows[0]) return notFound("Attendance record not found");

    const record = rows[0];
    const events = await db.sql`
      SELECT event_type, occurred_at, verification_method, client_ip, lat, lng, distance_m, site_id
      FROM attendance_events
      WHERE attendance_day_id = ${id}::uuid
      ORDER BY occurred_at ASC
    `;

    return NextResponse.json({ record: { ...record, events } });
  } catch (err) {
    console.error("attendance detail error", err);
    return internalError("Failed to load attendance record");
  }
}

const STATES = new Set(["open", "closed", "corrected"]);

/**
 * PATCH /api/admin/attendance/[id] — HR/correction view.
 * Body: { state?, correctionNotes?, checkInAt?, checkOutAt? }
 * Capability: attendance.correct (HR, Managing Director, Admin)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability("attendance.correct");
  if (isGateResponse(gate)) return gate;

  const { id } = await params;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const state = typeof body.state === "string" ? body.state.trim() : null;
    const correctionNotes =
      typeof body.correctionNotes === "string" ? body.correctionNotes.trim() : undefined;
    const checkInAt = typeof body.checkInAt === "string" ? body.checkInAt.trim() : undefined;
    const checkOutAt =
      "checkOutAt" in body && typeof body.checkOutAt === "string"
        ? body.checkOutAt.trim()
        : undefined;

    if (!state && checkInAt === undefined && checkOutAt === undefined && correctionNotes === undefined) {
      return badRequest("Nothing to update");
    }
    if (state && !STATES.has(state)) {
      return badRequest(`state must be one of: open, closed, corrected`);
    }
    for (const [key, value] of Object.entries({ checkInAt, checkOutAt })) {
      if (value === undefined || value === null || value === "") continue;
      if (Number.isNaN(Date.parse(value as string))) {
        return badRequest(`${key} must be a valid date/time`);
      }
    }

    const existing = await db.sql<{ id: string; check_out_at: string | null }>`
      SELECT id, check_out_at FROM attendance_days WHERE id = ${id}::uuid
    `;
    if (!existing[0]) return notFound("Attendance record not found");

    const sets: string[] = ["state = $1"];
    const vals: unknown[] = [state ?? "corrected"];
    if (correctionNotes !== undefined) {
      vals.push(correctionNotes);
      sets.push(`correction_notes = $${vals.length}`);
    }
    if (checkInAt !== undefined && checkInAt !== "") {
      vals.push(checkInAt);
      sets.push(`check_in_at = $${vals.length}::timestamptz`);
    }
    if ("checkOutAt" in body) {
      if (checkOutAt === "") {
        sets.push("check_out_at = NULL");
      } else if (checkOutAt) {
        vals.push(checkOutAt);
        sets.push(`check_out_at = $${vals.length}::timestamptz`);
      } else {
        return badRequest("checkOutAt must be a date/time or empty string to clear");
      }
    }
    vals.push(gate.email);
    sets.push(`corrected_by_email = $${vals.length}`);
    sets.push("corrected_at = NOW()");
    sets.push("updated_at = NOW()");

    vals.push(id);
    const idIdx = vals.length;

    const updated = await db.sql.unsafe(
      `UPDATE attendance_days SET ${sets.join(", ")}
       WHERE id = $${idIdx}::uuid
       RETURNING *`,
      vals,
    );

    return NextResponse.json({ record: updated[0], message: "Record corrected" });
  } catch (err) {
    console.error("attendance correction error", err);
    return internalError("Failed to correct attendance record");
  }
}
