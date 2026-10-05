import { NextResponse } from "next/server";
import { requireWorker, isResponse } from "@/lib/session";
import { listSites } from "@/lib/sites";
import { dbErrorResponse } from "@/lib/db-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const worker = await requireWorker();
  if (isResponse(worker)) return worker;

  try {
    const sites = await listSites({ activeOnly: true });
    return NextResponse.json({
      sites: sites.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        radius_m: s.radius_m,
      })),
    });
  } catch (err) {
    console.error("sites list error", err);
    return dbErrorResponse(err);
  }
}
