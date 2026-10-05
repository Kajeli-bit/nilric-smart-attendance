import { haversineMeters } from "@/lib/geo";
import { getOfficeConfig, type OfficeConfig } from "@/lib/env";
import { getActiveSiteById } from "@/lib/sites";
import type {
  GpsCoords,
  Site,
  VerificationFailure,
  VerificationResult,
  VerificationSuccess,
} from "@/lib/types";

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

export function parseSiteId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function verifySiteGeofence(
  site: Site,
  gps: GpsCoords,
): VerificationSuccess | VerificationFailure {
  const d = haversineMeters(gps.lat, gps.lng, site.lat, site.lng);
  if (d <= site.radius_m) {
    return {
      ok: true,
      method: "site_gps",
      distanceM: d,
      lat: gps.lat,
      lng: gps.lng,
      siteId: site.id,
      siteName: site.name,
    };
  }
  return {
    ok: false,
    reason: `You must be inside the geofence for ${site.name} (within ${Math.round(site.radius_m)}m).`,
  };
}

export async function verifyAttendance(
  clientIp: string | null,
  gps: GpsCoords | null,
  office: OfficeConfig = getOfficeConfig(),
  siteId?: string | null,
): Promise<VerificationResult> {
  const trimmedSiteId = siteId?.trim() || null;

  // Remote project site path — no HQ IP shortcut when a site is selected
  if (trimmedSiteId) {
    if (!gps) {
      return {
        ok: false,
        reason: `Location access is required to check in at this site.`,
      };
    }
    const site = await getActiveSiteById(trimmedSiteId);
    if (!site) {
      return {
        ok: false,
        reason: "Selected site is unavailable. Choose HQ or another active site.",
        errorCode: "SITE_UNAVAILABLE",
      };
    }
    return verifySiteGeofence(site, gps);
  }

  // HQ default path (unchanged)
  if (office.publicIp && clientIp && clientIp === office.publicIp) {
    return {
      ok: true,
      method: "office_ip",
      distanceM: null,
      lat: gps?.lat ?? null,
      lng: gps?.lng ?? null,
      siteId: null,
      siteName: null,
    };
  }

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
        siteId: null,
        siteName: null,
      };
    }
  }

  return {
    ok: false,
    reason: "Must be on office Wi-Fi (IP match), inside the HQ GPS radius, or at a selected project site",
  };
}
