import { NextResponse } from "next/server";
import { requireWorker, isResponse } from "@/lib/session";
import { db } from "@/lib/db";
import { internalError } from "@/lib/server-errors";

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

async function employeeIdForEmail(email: string): Promise<string | null> {
  const rows = await db.sql<{ id: string }>`
    SELECT id FROM employees WHERE email = ${email} AND active = TRUE LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

/**
 * GET /api/my/leaves — the signed-in worker's own leave requests.
 * Workers without an employee record get an empty list + needsEmployee flag.
 */
export async function GET() {
  const user = await requireWorker();
  if (isResponse(user)) return user;

  try {
    const employeeId = await employeeIdForEmail(user.email);
    if (!employeeId) {
      return NextResponse.json({
        leaves: [],
        needsEmployee: true,
        validatedDaysThisYear: 0,
      });
    }

    const rows = await db.sql`
      SELECT id, leave_type, date_from::text, date_to::text,
             days::float8 AS days, reason, state,
             approver_email, decided_at, decision_notes, created_at
      FROM leaves
      WHERE employee_id = ${employeeId}::uuid
      ORDER BY date_from DESC
      LIMIT 50
    `;

    const totals = await db.sql<{ days_taken: number }>`
      SELECT COALESCE(SUM(days), 0)::float8 AS days_taken
      FROM leaves
      WHERE employee_id = ${employeeId}::uuid
        AND state = 'validated'
        AND date_from >= (DATE_TRUNC('year', CURRENT_DATE))::date
    `;

    return NextResponse.json({
      leaves: rows,
      needsEmployee: false,
      validatedDaysThisYear: totals[0]?.days_taken ?? 0,
    });
  } catch (err) {
    console.error("my leaves error", err);
    return internalError("Failed to load your leave requests");
  }
}

/**
 * POST /api/my/leaves — request leave for yourself (state: to_approve).
 * Body: { leaveType, dateFrom, dateTo, reason? }
 */
export async function POST(request: Request) {
  const user = await requireWorker();
  if (isResponse(user)) return user;

  try {
    const employeeId = await employeeIdForEmail(user.email);
    if (!employeeId) {
      return NextResponse.json(
        {
          error: "NO_EMPLOYEE_RECORD",
          message:
            "You need an employee record before requesting time off. Ask HR to add you in Employees.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const leaveType = typeof body.leaveType === "string" ? body.leaveType.trim() : "annual";
    const dateFrom = typeof body.dateFrom === "string" ? body.dateFrom.trim() : "";
    const dateTo = typeof body.dateTo === "string" ? body.dateTo.trim() : "";
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;

    if (!LEAVE_TYPES.has(leaveType)) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid leave type" },
        { status: 400 },
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "dateFrom and dateTo must be YYYY-MM-DD" },
        { status: 400 },
      );
    }
    const fromMs = Date.parse(`${dateFrom}T00:00:00Z`);
    const toMs = Date.parse(`${dateTo}T00:00:00Z`);
    if (toMs < fromMs) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "dateTo must not be before dateFrom" },
        { status: 400 },
      );
    }
    // Reject requests in the past.
    const today = new Date().toISOString().slice(0, 10);
    if (dateTo < today) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Requests must cover today or later" },
        { status: 400 },
      );
    }

    // Overlap guard against pending/validated requests.
    const overlap = await db.sql<{ id: string }>`
      SELECT id FROM leaves
      WHERE employee_id = ${employeeId}::uuid
        AND state IN ('to_approve', 'validated')
        AND (date_from, date_to) OVERLAPS (${dateFrom}::date, ${dateTo}::date)
      LIMIT 1
    `;
    if (overlap[0]) {
      return NextResponse.json(
        {
          error: "CONFLICT",
          message: "Your dates overlap an existing pending or validated leave",
        },
        { status: 409 },
      );
    }

    const days = Math.round((toMs - fromMs) / 86400000) + 1;

    const inserted = await db.sql`
      INSERT INTO leaves (employee_id, leave_type, date_from, date_to, days, reason, state, created_by)
      VALUES (${employeeId}::uuid, ${leaveType}, ${dateFrom}, ${dateTo}, ${days}, ${reason}, 'to_approve', ${user.email})
      RETURNING id, leave_type, date_from, date_to, days, reason, state, created_at
    `;

    return NextResponse.json(
      { leave: inserted[0], message: "Leave request submitted for approval" },
      { status: 201 },
    );
  } catch (err) {
    console.error("my leave create error", err);
    return internalError("Failed to submit leave request");
  }
}
