import { NextResponse } from "next/server";
import { adminLogoutCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", adminLogoutCookie());
  return res;
}
