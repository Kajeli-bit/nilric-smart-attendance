import { NextResponse } from "next/server";
import { requireAdmin, isResponse } from "@/lib/session";
import { getDb } from "@/lib/workers";
import { buildReportRows } from "@/lib/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;

  try {
    const db = getDb();
    const url = new URL(request.url);
    const from = url.searchParams.get("from")?.trim();
    const to = url.searchParams.get("to")?.trim();
    const workerId = url.searchParams.get("workerId")?.trim();

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

    const sql = `
      SELECT
        ad.worker_id,
        COALESCE(w.employee_code, w.email) AS employee_code,
        w.name,
        w.email,
        ad.attendance_day,
        ad.check_in_at,
        ad.check_out_at,
        ad.check_in_method,
        ad.check_out_method,
        ad.check_in_distance_m,
        ad.check_out_distance_m
      FROM attendance_days ad
      JOIN workers w ON w.id = ad.worker_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY ad.attendance_day DESC, w.name ASC
      LIMIT 5000
    `;

    const raw = await db.sql.unsafe(sql, parts);
    const rows = buildReportRows(raw as never);
    return NextResponse.json({ rows });
  } catch (err) {
    console.error("admin attendance error", err);
    return NextResponse.json(
      { error: "INTERNAL", message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
