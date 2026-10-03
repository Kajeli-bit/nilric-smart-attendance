import { haversineMeters } from "@/lib/geo";
import { getOfficeConfig, type OfficeConfig } from "@/lib/env";
import type { GpsCoords, VerificationResult } from "@/lib/types";

export function getClientIp(headers: Headers): string | null {
  // Vercel
  const vercel = headers.get("x-real-ip") || headers.get("x-vercel-forwarded-for");
  if (vercel?.trim()) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }

  // Netlify (legacy) then generic reverse proxy
  const nf = headers.get("x-nf-client-connection-ip");
  if (nf?.trim()) return nf.trim();

  const xff = headers.get("x-forwarded-for");
  if (!xff) return null;
  const first = xff.split(",")[0]?.trim();
  return first || null;
}

export function parseGps(value: unknown): GpsCoords | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as { lat?: unknown; lng?: unknown };
  const lat = typeof obj.lat === "number" ? obj.lat : Number(obj.lat);
  const lng = typeof obj.lng === "number" ? obj.lng : Number(obj.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function verifyAttendance(
  clientIp: string | null,
  gps: GpsCoords | null,
  office: OfficeConfig = getOfficeConfig(),
): VerificationResult {
  // Layer 1 — office public IP
  if (
    office.publicIp &&
    clientIp &&
    clientIp === office.publicIp
  ) {
    return {
      ok: true,
      method: "office_ip",
      distanceM: null,
      lat: gps?.lat ?? null,
      lng: gps?.lng ?? null,
    };
  }

  // Layer 2 — GPS geofence fallback
  if (
    gps &&
    office.lat !== null &&
    office.lng !== null &&
    office.radiusMeters > 0
  ) {
    const d = haversineMeters(gps.lat, gps.lng, office.lat, office.lng);
    if (d <= office.radiusMeters) {
      return {
        ok: true,
        method: "gps",
        distanceM: d,
        lat: gps.lat,
        lng: gps.lng,
      };
    }
  }

  return {
    ok: false,
    reason: "Must be on office Wi-Fi (IP match) or inside the GPS radius",
  };
}
