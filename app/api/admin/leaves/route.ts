import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isGateResponse, requireCapability } from "@/lib/platform";
import { badRequest, internalError } from "@/lib/server-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEAVE_TYPES = new Set([
  "annual",
  "sick",
  "unpaid",
  "maternity",
  "compassionate",
  "other",
]);
const STATES = new Set(["draft", "to_approve", "refused", "validated"]);

function daysInclusive(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

/** GET /api/admin/leaves — leave requests for roles with leaves.view. */
export async function GET(request: Request) {
  const gate = await requireCapability("leaves.view");
  if (isGateResponse(gate)) return gate;

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const state = url.searchParams.get("state")?.trim() ?? "";
    const type = url.searchParams.get("type")?.trim() ?? "";
    const employeeId = url.searchParams.get("employeeId")?.trim() ?? "";
    const from = url.searchParams.get("from")?.trim() ?? "";
    const to = url.searchParams.get("to")?.trim() ?? "";

    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];

    if (q) {
      params.push(`%${q}%`);
      const n = params.length;
      conditions.push(
        `(e.name ILIKE $${n} OR e.email ILIKE $${n} OR l.reason ILIKE $${n} OR e.department ILIKE $${n})`,
      );
    }
    if (state && STATES.has(state)) {
      params.push(state);
      conditions.push(`l.state = $${params.length}`);
    }
    if (type && LEAVE_TYPES.has(type)) {
      params.push(type);
      conditions.push(`l.leave_type = $${params.length}`);
    }
    if (employeeId) {
      params.push(employeeId);
      conditions.push(`l.employee_id = $${params.length}::uuid`);
    }
    if (from) {
      params.push(from);
      conditions.push(`l.date_to >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      conditions.push(`l.date_from <= $${params.length}::date`);
    }

    params.push(2000);
    const limitIdx = params.length;

    const rows = await db.sql.unsafe(
      `SELECT
        l.id,
        l.employee_id,
        e.name AS employee_name,
        e.email AS employee_email,
        e.department AS employee_department,
        e.job_title AS employee_job_title,
        l.leave_type,
        l.date_from,
        l.date_to,
        l.days::float8 AS days,
        l.reason,
        l.state,
        l.approver_email,
        l.decided_at,
        l.decision_notes,
        l.created_at,
        l.updated_at
      FROM leaves l
      JOIN employees e ON e.id = l.employee_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY
        (l.state = 'to_approve') DESC,
        l.date_from DESC,
        e.name ASC
      LIMIT $${limitIdx}`,
      params,
    );

    return NextResponse.json({ leaves: rows });
  } catch (err) {
    console.error("leaves list error", err);
    return internalError("Failed to load leave requests");
  }
}

/** POST /api/admin/leaves — create a leave request (employees.manage). */
export async function POST(request: Request) {
  const gate = await requireCapability("leaves.manage");
  if (isGateResponse(gate)) return gate;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    const leaveType = typeof body.leaveType === "string" ? body.leaveType.trim() : "annual";
    const dateFrom = typeof body.dateFrom === "string" ? body.dateFrom.trim() : "";
    const dateTo = typeof body.dateTo === "string" ? body.dateTo.trim() : "";
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
    const state = typeof body.state === "string" ? body.state.trim() : "to_approve";

    if (!employeeId) return badRequest("employeeId is required");
    if (!LEAVE_TYPES.has(leaveType)) {
      return badRequest(
        "leaveType must be one of: annual, sick, unpaid, maternity, compassionate, other",
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      return badRequest("dateFrom and dateTo must be YYYY-MM-DD");
    }
    if (Date.parse(`${dateTo}T00:00:00Z`) < Date.parse(`${dateFrom}T00:00:00Z`)) {
      return badRequest("dateTo must not be before dateFrom");
    }
    if (!STATES.has(state)) {
      return badRequest("state must be one of: draft, to_approve, refused, validated");
    }

    const employee = await db.sql<{ id: string; active: boolean }>`
      SELECT id, active FROM employees WHERE id = ${employeeId}::uuid
    `;
    if (!employee[0]) return badRequest("Employee not found");
    if (!employee[0].active) return badRequest("Employee is not active");

    const days = body.days ? Number(body.days) : daysInclusive(dateFrom, dateTo);
    if (!Number.isFinite(days) || days <= 0) return badRequest("Invalid day count");

    const approverEmail = state === "validated" || state === "refused" ? gate.email : null;
    const decidedAt = state === "validated" || state === "refused" ? new Date().toISOString() : null;

    const inserted = await db.sql<{
      id: string;
      leave_type: string;
      date_from: string;
      date_to: string;
      days: number;
      reason: string | null;
      state: string;
      approver_email: string | null;
      decided_at: string | null;
      created_at: string;
    }>`
      INSERT INTO leaves (employee_id, leave_type, date_from, date_to, days, reason, state, approver_email, decided_at, created_by)
      VALUES (${employeeId}::uuid, ${leaveType}, ${dateFrom}, ${dateTo}, ${days}, ${reason}, ${state}, ${approverEmail},
              ${decidedAt ? new Date(decidedAt) : null}, ${gate.email})
      RETURNING id, leave_type, date_from, date_to, days::float8 AS days, reason, state, approver_email, decided_at, created_at
    `;

    return NextResponse.json({ leave: inserted[0] }, { status: 201 });
  } catch (err) {
    console.error("leave create error", err);
    return internalError("Failed to create leave request");
  }
}
