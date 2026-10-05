import { NextResponse } from "next/server";
import { requireAdmin, isResponse } from "@/lib/session";
import { getSiteById, parseSiteInput, updateSite } from "@/lib/sites";
import { dbErrorResponse } from "@/lib/db-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;

  try {
    const { id } = await context.params;
    const existing = await getSiteById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Site not found" },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Site payload is required" },
        { status: 400 },
      );
    }

    const patch = body as Record<string, unknown>;
    const partial: Parameters<typeof updateSite>[1] = {};
    if ("name" in patch || "lat" in patch || "lng" in patch || "radiusM" in patch || "radius_m" in patch || "address" in patch || "active" in patch) {
      const merged = parseSiteInput({
        name: patch.name ?? existing.name,
        address: "address" in patch ? patch.address : existing.address,
        lat: patch.lat ?? existing.lat,
        lng: patch.lng ?? existing.lng,
        radiusM: patch.radiusM ?? patch.radius_m ?? existing.radius_m,
        active: "active" in patch ? patch.active : existing.active,
      });
      if ("error" in merged) {
        return NextResponse.json(
          { error: "INVALID_INPUT", message: merged.error },
          { status: 400 },
        );
      }
      if ("name" in patch) partial.name = merged.name;
      if ("address" in patch) partial.address = merged.address;
      if ("lat" in patch || "lng" in patch) {
        partial.lat = merged.lat;
        partial.lng = merged.lng;
      }
      if ("radiusM" in patch || "radius_m" in patch) partial.radiusM = merged.radiusM;
      if ("active" in patch) partial.active = merged.active;
    }

    const site = await updateSite(id, partial);
    if (!site) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Site not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ site });
  } catch (err) {
    console.error("admin sites update error", err);
    return dbErrorResponse(err);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;

  try {
    const { id } = await context.params;
    const existing = await getSiteById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Site not found" },
        { status: 404 },
      );
    }
    const site = await updateSite(id, { active: false });
    return NextResponse.json({ site });
  } catch (err) {
    console.error("admin sites delete error", err);
    return dbErrorResponse(err);
  }
}
