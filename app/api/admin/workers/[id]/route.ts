import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";
import type { Worker } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorJson(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  try {
    const { id } = await params;
    const rows = await db.sql<Worker>`
      SELECT id, employee_code, name, active, created_at, updated_at
      FROM workers WHERE id = ${id}
    `;
    if (!rows[0]) return errorJson(404, "NOT_FOUND", "Worker not found");
    return NextResponse.json({ worker: rows[0] });
  } catch (err) {
    console.error("admin worker get error", err);
    return errorJson(500, "INTERNAL", "Internal Server Error");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      name?: unknown;
      employeeCode?: unknown;
    };

    const sets: string[] = [];
    const parts: unknown[] = [];

    if (typeof body.name === "string" && body.name.trim()) {
      parts.push(body.name.trim());
      sets.push(`name = $${parts.length}`);
    }
    if (typeof body.employeeCode === "string" && body.employeeCode.trim()) {
      parts.push(body.employeeCode.trim().toUpperCase());
      sets.push(`employee_code = $${parts.length}`);
    }

    if (!sets.length) {
      return errorJson(400, "INVALID_INPUT", "Nothing to update");
    }

    parts.push("NOW()");
    sets.push(`updated_at = $${parts.length}`);
    parts.push(id);

    const sql = `UPDATE workers SET ${sets.join(", ")} WHERE id = $${parts.length}
      RETURNING id, employee_code, name, active, created_at, updated_at`;

    const rows = (await db.sql.unsafe(sql, parts)) as unknown as Worker[];
    if (!rows[0]) return errorJson(404, "NOT_FOUND", "Worker not found");
    return NextResponse.json({ worker: rows[0] });
  } catch (err) {
    console.error("admin worker patch error", err);
    return errorJson(500, "INTERNAL", "Internal Server Error");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Support /api/admin/workers/[id]/deactivate via separate routes; this is unused
  // if Next routes are separate. Kept for completeness if path is [id] + action in query.
  if (!isAdminAuthenticated(request)) return unauthorized();
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    if (action !== "activate" && action !== "deactivate") {
      return errorJson(400, "INVALID_INPUT", "action must be activate or deactivate");
    }
    const active = action === "activate";
    const rows = await db.sql<Worker>`
      UPDATE workers SET active = ${active}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, employee_code, name, active, created_at, updated_at
    `;
    if (!rows[0]) return errorJson(404, "NOT_FOUND", "Worker not found");
    return NextResponse.json({ worker: rows[0] });
  } catch (err) {
    console.error("admin worker action error", err);
    return errorJson(500, "INTERNAL", "Internal Server Error");
  }
}
