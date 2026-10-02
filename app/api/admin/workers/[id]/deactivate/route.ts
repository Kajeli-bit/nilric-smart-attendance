import { NextResponse } from "next/server";
import { requireAdmin, isResponse } from "@/lib/session";
import { getDb } from "@/lib/workers";
import type { Worker } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  try {
    const db = getDb();
    const { id } = await params;
    const rows = await db.sql<Worker>`
      UPDATE workers SET active = FALSE, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, employee_code, name, email, active, created_at, updated_at
    `;
    if (!rows[0]) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Worker not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ worker: rows[0] });
  } catch (err) {
    console.error("admin worker deactivate error", err);
    return NextResponse.json(
      { error: "INTERNAL", message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
