import { NextResponse } from "next/server";
import { buildReportRows } from "@/lib/report";
import { db } from "@/lib/db";
import { isGateResponse, requireCapability } from "@/lib/platform";
import { internalError } from "@/lib/server-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/attendance — attendance records for roles with
 * attendance.view (HR, Accountant, Managing Director, Admin).
 * Keeps the historical report-row shape and adds id/state for the
 * Odoo-style record list.
 */
export async function GET(request: Request) {
  const gate = await requireCapability("attendance.view");
  if (isGateResponse(gate)) return gate;

  try {
    const url = new URL(request.url);
    const from = url.searchParams.get("from")?.trim();
    const to = url.searchParams.get("to")?.trim();
    const workerId = url.searchParams.get("workerId")?.trim();
    const state = url.searchParams.get("state")?.trim();

    const conditions: string[] = ["1=1"];
    const parts: unknown[] = [];

    if (from) {
      parts.push(from);
      conditions.push(`ad.attendance_day >= $${parts.length}::date`);
    }
    if (to) {
      parts.push(to);
      conditions.push(`ad.attendance_day <= $${parts.length}::date`);
    }
    if (workerId) {
      parts.push(workerId);
      conditions.push(`ad.worker_id = $${parts.length}::uuid`);
    }
    if (state === "open" || state === "closed" || state === "corrected") {
      parts.push(state);
      conditions.push(`ad.state = $${parts.length}`);
    } else if (state === "missing") {
      // No check-in record for today: surfaced as an informational filter.
      conditions.push("FALSE");
    }

    parts.push(5000);
    const limitIdx = parts.length;

    const raw = await db.sql.unsafe(
      `SELECT
        ad.id,
        ad.state,
        ad.worker_id,
        COALESCE(e.name, w.name) AS employee_name,
        COALESCE(e.role, '') AS employee_role,
        COALESCE(e.department, '') AS employee_department,
        w.employee_code,
        w.email,
        w.name,
        ad.attendance_day,
        ad.check_in_at,
        ad.check_out_at,
        ad.check_in_method,
        ad.check_out_method,
        ad.check_in_distance_m,
        ad.check_out_distance_m
      FROM attendance_days ad
      JOIN workers w ON w.id = ad.worker_id
      LEFT JOIN employees e ON e.email = w.email AND e.active = TRUE
      WHERE ${conditions.join(" AND ")}
      ORDER BY ad.attendance_day DESC, w.name ASC
      LIMIT $${limitIdx}`,
      parts,
    );

    const reportRows = buildReportRows(raw as never);
    // Attach id/state/employee enrichments in the same order as raw rows.
    const rows = reportRows.map((row, i) => {
      const r = raw[i] as {
        id: string;
        state: string;
        employee_name: string;
        employee_role: string;
        employee_department: string;
      } | undefined;
      return {
        ...row,
        id: r?.id ?? null,
        state: r?.state ?? "open",
        employeeName: r?.employee_name || row.name,
        employeeRole: r?.employee_role || null,
        employeeDepartment: r?.employee_department || null,
      };
    });

    return NextResponse.json({ rows });
  } catch (err) {
    console.error("admin attendance error", err);
    return internalError("Failed to load attendance records");
  }
}
