import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminAuthenticated, unauthorized } from "@/lib/admin-auth";
import type { Worker } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthenticated(request)) return unauthorized();
  try {
    const { id } = await params;
    const rows = await db.sql<Worker>`
      UPDATE workers SET active = TRUE, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, employee_code, name, active, created_at, updated_at
    `;
    if (!rows[0]) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Worker not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ worker: rows[0] });
  } catch (err) {
    console.error("admin worker activate error", err);
    return NextResponse.json(
      { error: "INTERNAL", message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
