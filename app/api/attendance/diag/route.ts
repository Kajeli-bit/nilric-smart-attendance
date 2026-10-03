import { NextResponse } from "next/server";
import { getDb } from "@/lib/workers";
import { classifyDbError } from "@/lib/db-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Safe DB diagnostics for check-in 500s.
 * Never returns connection strings or secret values.
 */
export async function GET() {
  const checks: Record<string, boolean | string> = {
    hasPostgresUrl: Boolean(
      process.env.POSTGRES_URL?.trim() ||
        process.env.POSTGRES_URL_NON_POOLING?.trim() ||
        process.env.POSTGRES_PRISMA_URL?.trim() ||
        process.env.DATABASE_URL?.trim(),
    ),
    hasAuthSecret: Boolean(process.env.AUTH_SECRET?.trim()),
  };

  try {
    const db = getDb();
    const ping = await db.sql<{ ok: number }>`SELECT 1 AS ok`;
    checks.ping = Boolean(ping[0]?.ok === 1);

    const workers = await db.sql<{ email_column: boolean }>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workers' AND column_name = 'email'
      ) AS email_column
    `;
    checks.workersEmailColumn = Boolean(workers[0]?.email_column);

    const attendance = await db.sql<{ exists: boolean }>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'attendance_days'
      ) AS exists
    `;
    checks.attendanceDaysTable = Boolean(attendance[0]?.exists);

    return NextResponse.json({
      ok: true,
      readyForCheckIn: Boolean(
        checks.ping &&
          checks.workersEmailColumn &&
          checks.attendanceDaysTable,
      ),
      checks,
    });
  } catch (err) {
    const classified = classifyDbError(err);
    return NextResponse.json(
      {
        ok: false,
        readyForCheckIn: false,
        checks,
        error: classified.error,
        message: classified.message,
      },
      { status: classified.status },
    );
  }
}
