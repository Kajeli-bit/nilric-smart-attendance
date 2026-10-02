import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";
import type { Worker } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminAuthenticated(request)) return unauthorized();

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const activeParam = url.searchParams.get("active");

    const conditions: string[] = [];
    const parts: unknown[] = [];
    const sqlParts: string[] = [];

    if (q) {
      parts.push(`%${q}%`, `%${q}%`);
      sqlParts.push(
        `(employee_code ILIKE $${parts.length - 1} OR name ILIKE $${parts.length})`,
      );
    }
    if (activeParam === "true" || activeParam === "false") {
      parts.push(activeParam === "true");
      sqlParts.push(`active = $${parts.length}`);
    }

    let rows: Worker[];
    if (!sqlParts.length) {
      rows = await db.sql<Worker>`
        SELECT id, employee_code, name, active, created_at, updated_at
        FROM workers
        ORDER BY employee_code ASC
      `;
    } else {
      const sql = `SELECT id, employee_code, name, active, created_at, updated_at
        FROM workers
        WHERE ${sqlParts.join(" AND ")}
        ORDER BY employee_code ASC`;
      rows = (await db.sql.unsafe(sql, parts)) as unknown as Worker[];
    }

    void conditions;
    return NextResponse.json({ workers: rows });
  } catch (err) {
    console.error("admin workers list error", err);
    return NextResponse.json(
      { error: "INTERNAL", message: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAdminAuthenticated(request)) return unauthorized();

  try {
    const body = (await request.json()) as {
      employeeCode?: unknown;
      name?: unknown;
    };

    const employeeCode =
      typeof body.employeeCode === "string" ? body.employeeCode.trim().toUpperCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!employeeCode || !name) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "employeeCode and name are required" },
        { status: 400 },
      );
    }

    const inserted = await db.sql<Worker>`
      INSERT INTO workers (employee_code, name, active)
      VALUES (${employeeCode}, ${name}, TRUE)
      ON CONFLICT (employee_code) DO UPDATE
        SET name = EXCLUDED.name, updated_at = NOW()
      RETURNING id, employee_code, name, active, created_at, updated_at
    `;

    return NextResponse.json({ worker: inserted[0] }, { status: 201 });
  } catch (err) {
    console.error("admin workers create error", err);
    return NextResponse.json(
      { error: "INTERNAL", message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
