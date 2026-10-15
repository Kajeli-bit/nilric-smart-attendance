import { NextResponse } from "next/server";

/** Consistent JSON error helpers for v1 platform API routes. */

export function unauthorized(message = "Sign in with Google to continue") {
  return NextResponse.json(
    { error: "UNAUTHORIZED", message },
    { status: 401 },
  );
}

export function forbidden(
  message = "You do not have access to this resource",
  role?: string,
) {
  return NextResponse.json(
    { error: "FORBIDDEN", message, role },
    { status: 403 },
  );
}

export function badRequest(message: string) {
  return NextResponse.json(
    { error: "BAD_REQUEST", message },
    { status: 400 },
  );
}

export function notFound(message = "Record not found") {
  return NextResponse.json(
    { error: "NOT_FOUND", message },
    { status: 404 },
  );
}

export function internalError(message = "Internal server error") {
  return NextResponse.json(
    { error: "INTERNAL", message },
    { status: 500 },
  );
}
