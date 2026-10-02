import { NextResponse } from "next/server";
import { requireAdmin, isResponse } from "@/lib/session";
import { getDb } from "@/lib/workers";
import type { Worker } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;

  try {
    const db = getDb();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const activeParam = url.searchParams.get("active");

    const parts: unknown[] = [];
    const sqlParts: string[] = [];

    if (q) {
      parts.push(`%${q}%`, `%${q}%`, `%${q}%`);
      sqlParts.push(
        `(COALESCE(employee_code, '') ILIKE $${parts.length - 2} OR name ILIKE $${parts.length - 1} OR email ILIKE $${parts.length})`,
      );
    }
    if (activeParam === "true" || activeParam === "false") {
      parts.push(activeParam === "true");
      sqlParts.push(`active = $${parts.length}`);
    }

    let rows: Worker[];
    if (!sqlParts.length) {
      rows = await db.sql<Worker>`
        SELECT id, employee_code, name, email, active, created_at, updated_at
        FROM workers
        ORDER BY name ASC
      `;
    } else {
      const sql = `SELECT id, employee_code, name, email, active, created_at, updated_at
        FROM workers
        WHERE ${sqlParts.join(" AND ")}
        ORDER BY name ASC`;
      rows = (await db.sql.unsafe(sql, parts)) as unknown as Worker[];
    }

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
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;

  try {
    const db = getDb();
    const body = (await request.json()) as {
      name?: unknown;
      email?: unknown;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!name && !email) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "name or email is required" },
        { status: 400 },
      );
    }

    const inserted = await db.sql<Worker>`
      INSERT INTO workers (name, email, active)
      VALUES (${name || email.split("@")[0] || "Worker"}, ${email || null}, TRUE)
      RETURNING id, employee_code, name, email, active, created_at, updated_at
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
