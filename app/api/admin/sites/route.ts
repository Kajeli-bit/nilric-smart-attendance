import { NextResponse } from "next/server";
import { requireAdmin, isResponse } from "@/lib/session";
import { createSite, listSites, parseSiteInput } from "@/lib/sites";
import { dbErrorResponse } from "@/lib/db-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;

  try {
    const sites = await listSites();
    return NextResponse.json({ sites });
  } catch (err) {
    console.error("admin sites list error", err);
    return dbErrorResponse(err);
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;

  try {
    const body = await request.json().catch(() => null);
    const parsed = parseSiteInput(body);
    if ("error" in parsed) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: parsed.error },
        { status: 400 },
      );
    }

    const site = await createSite(parsed, admin.email);
    return NextResponse.json({ site }, { status: 201 });
  } catch (err) {
    console.error("admin sites create error", err);
    return dbErrorResponse(err);
  }
}
