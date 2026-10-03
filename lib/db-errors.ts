import { NextResponse } from "next/server";

export function classifyDbError(err: unknown): {
  status: number;
  error: string;
  message: string;
} {
  const e = err as { name?: string; message?: string; code?: string };
  const name = e?.name || "";
  const message = e?.message || String(err);

  if (
    name === "MissingDatabaseConnectionError" ||
    /DATABASE_NOT_CONFIGURED|POSTGRES_URL|DATABASE_URL|not been configured/i.test(
      message,
    )
  ) {
    return {
      status: 503,
      error: "DATABASE_NOT_CONFIGURED",
      message:
        "Postgres is not configured for this Vercel project. Install Neon Postgres (Marketplace) or set POSTGRES_URL, then redeploy.",
    };
  }

  if (/does not exist|Undefined table|schema/i.test(message)) {
    return {
      status: 503,
      error: "DATABASE_SCHEMA_MISSING",
      message:
        "Database tables are missing. Run `npm run db:migrate` against POSTGRES_URL (or apply db/migrations), then redeploy.",
    };
  }

  if (/ON CONFLICT|unique or exclusion constraint|unique violation|duplicate key/i.test(message)) {
    return {
      status: 409,
      error: "DATABASE_CONFLICT",
      message: "Conflicting attendance or worker record. Try again in a moment.",
    };
  }

  if (/column .* does not exist|attribute .* of relation/i.test(message)) {
    return {
      status: 503,
      error: "DATABASE_SCHEMA_OUTDATED",
      message:
        "Database schema is outdated (missing columns). Ensure migrations 0001–0003 are applied, then redeploy.",
    };
  }

  if (/timeout|ECONN|connection|ENOTFOUND|CONNECT_TIMEOUT/i.test(message)) {
    return {
      status: 503,
      error: "DATABASE_UNAVAILABLE",
      message: "Could not reach the database. Please try again.",
    };
  }

  return {
    status: 500,
    error: "INTERNAL",
    message: "Internal Server Error",
  };
}

export function dbErrorResponse(err: unknown): NextResponse {
  const classified = classifyDbError(err);
  console.error("attendance/db error", classified.error, err);
  return NextResponse.json(
    { error: classified.error, message: classified.message },
    { status: classified.status },
  );
}
