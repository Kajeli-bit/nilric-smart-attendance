import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";
import { buildReportRows } from "@/lib/report";
import { csvAttachmentFilename, csvHeaders, toCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminAuthenticated(request)) return unauthorized();

  try {
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
        w.employee_code,
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
      WHERE ${conditions.join(" AND ")}
      ORDER BY ad.attendance_day DESC, w.employee_code ASC
      LIMIT 20000
    `;

    const raw = await db.sql.unsafe(sql, parts);
    const rows = buildReportRows(raw as never);

    const csv = toCsv(
      csvHeaders(),
      rows.map((r) => [
        r.employeeCode,
        r.name,
        r.attendanceDay,
        r.checkInAt,
        r.checkOutAt,
        r.checkInMethod,
        r.checkOutMethod,
        r.checkInDistanceMeters,
        r.checkOutDistanceMeters,
        r.workedMinutes,
      ]),
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvAttachmentFilename()}"`,
      },
    });
  } catch (err) {
    console.error("admin attendance csv error", err);
    return NextResponse.json(
      { error: "INTERNAL", message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
