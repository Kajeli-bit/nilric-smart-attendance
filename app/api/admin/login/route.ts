import { NextResponse } from "next/server";
import {
  adminLoginCookie,
  timingSafeEqualStr,
} from "@/lib/admin-auth";
import { getAdminPassword } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: unknown };
    const password = typeof body.password === "string" ? body.password : "";

    let ok = false;
    try {
      ok = timingSafeEqualStr(password, getAdminPassword());
    } catch {
      ok = false;
    }

    if (!ok) {
      return NextResponse.json(
        { error: "INVALID_PASSWORD", message: "Invalid admin password" },
        { status: 401 },
      );
    }

    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", adminLoginCookie());
    return res;
  } catch (err) {
    console.error("admin login error", err);
    return NextResponse.json(
      { error: "INTERNAL", message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
