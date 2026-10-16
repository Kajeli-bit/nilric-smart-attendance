import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isGateResponse, requireCapability } from "@/lib/platform";
import { badRequest, notFound, internalError } from "@/lib/server-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATES = new Set(["draft", "to_approve", "refused", "validated"]);

/** GET /api/admin/leaves/[id] — leave request detail. Capability: leaves.view */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability("leaves.view");
  if (isGateResponse(gate)) return gate;

  const { id } = await params;
  try {
    const rows = await db.sql`
      SELECT
        l.*,
        e.name AS employee_name,
        e.email AS employee_email,
        e.department AS employee_department,
        e.job_title AS employee_job_title
      FROM leaves l
      JOIN employees e ON e.id = l.employee_id
      WHERE l.id = ${id}::uuid
    `;
    if (!rows[0]) return notFound("Leave request not found");

    const employee = await db.sql<{ days_taken: number }>`
      SELECT COALESCE(SUM(days), 0)::float8 AS days_taken
      FROM leaves
      WHERE employee_id = ${(rows[0] as { employee_id: string }).employee_id}::uuid
        AND state = 'validated'
        AND date_from >= (DATE_TRUNC('year', CURRENT_DATE))::date
    `;

    return NextResponse.json({
      leave: { ...rows[0], validatedDaysThisYear: employee[0]?.days_taken ?? 0 },
    });
  } catch (err) {
    console.error("leave detail error", err);
    return internalError("Failed to load leave request");
  }
}

/**
 * PATCH /api/admin/leaves/[id] — approve / refuse / back to draft.
 * Body: { state?, decisionNotes?, leaveType?, dateFrom?, dateTo?, reason? }
 * Capability: leaves.manage (HR, Managing Director, Admin)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability("leaves.manage");
  if (isGateResponse(gate)) return gate;

  const { id } = await params;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const state = typeof body.state === "string" ? body.state.trim() : null;
    const decisionNotes =
      typeof body.decisionNotes === "string" && body.decisionNotes.trim()
        ? body.decisionNotes.trim()
        : null;
    const leaveType = typeof body.leaveType === "string" ? body.leaveType.trim() : null;
    const dateFrom = typeof body.dateFrom === "string" ? body.dateFrom.trim() : null;
    const dateTo = typeof body.dateTo === "string" ? body.dateTo.trim() : null;
    const reason = typeof body.reason === "string" ? body.reason.trim() : null;

    if (!state && !decisionNotes && !leaveType && !dateFrom && !dateTo && reason === null) {
      return badRequest("Nothing to update");
    }
    if (state && !STATES.has(state)) {
      return badRequest("state must be one of: draft, to_approve, refused, validated");
    }
    for (const [key, value] of Object.entries({ dateFrom, dateTo })) {
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value as string)) {
        return badRequest(`${key} must be YYYY-MM-DD`);
      }
    }

    const existing = await db.sql<{ id: string; date_from: string; date_to: string }>`
      SELECT id, date_from::text, date_to::text FROM leaves WHERE id = ${id}::uuid
    `;
    if (!existing[0]) return notFound("Leave request not found");

    const effectiveFrom = dateFrom ?? existing[0].date_from;
    const effectiveTo = dateTo ?? existing[0].date_to;
    if (
      Date.parse(`${effectiveTo}T00:00:00Z`) < Date.parse(`${effectiveFrom}T00:00:00Z`)
    ) {
      return badRequest("dateTo must not be before dateFrom");
    }
    const days = Math.round(
      (Date.parse(`${effectiveTo}T00:00:00Z`) - Date.parse(`${effectiveFrom}T00:00:00Z`)) /
        86400000,
    ) + 1;

    const sets: string[] = [`days = $1`];
    const vals: unknown[] = [days];
    if (state) {
      vals.push(state);
      sets.push(`state = $${vals.length}`);
      if (state === "validated" || state === "refused") {
        vals.push(gate.email);
        sets.push(`approver_email = $${vals.length}`);
        vals.push(new Date());
        sets.push(`decided_at = $${vals.length}`);
      } else {
        vals.push(null);
        sets.push(`approver_email = $${vals.length}`);
        vals.push(null);
        sets.push(`decided_at = $${vals.length}`);
      }
    }
    if (decisionNotes) {
      vals.push(decisionNotes);
      sets.push(`decision_notes = $${vals.length}`);
    }
    if (leaveType) {
      vals.push(leaveType);
      sets.push(`leave_type = $${vals.length}`);
    }
    if (dateFrom) {
      vals.push(dateFrom);
      sets.push(`date_from = $${vals.length}::date`);
    }
    if (dateTo) {
      vals.push(dateTo);
      sets.push(`date_to = $${vals.length}::date`);
    }
    if (reason !== null && reason !== undefined) {
      vals.push(reason);
      sets.push(`reason = $${vals.length}`);
    }
    vals.push(new Date());
    sets.push(`updated_at = $${vals.length}`);
    vals.push(id);
    const idIdx = vals.length;

    const updated = await db.sql.unsafe(
      `UPDATE leaves SET ${sets.join(", ")}
       WHERE id = $${idIdx}::uuid
       RETURNING *`,
      vals,
    );

    return NextResponse.json({
      leave: updated[0],
      message:
        state === "validated"
          ? "Leave approved"
          : state === "refused"
            ? "Leave refused"
            : "Leave updated",
    });
  } catch (err) {
    console.error("leave update error", err);
    return internalError("Failed to update leave request");
  }
}
