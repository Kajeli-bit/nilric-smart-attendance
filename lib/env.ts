function required(name: string, value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export interface OfficeConfig {
  name: string;
  city: string;
  publicIp: string | null;
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
  timezone: string;
}

export function getOfficeConfig(): OfficeConfig {
  const name = process.env.OFFICE_NAME?.trim() || "Office";
  const city = process.env.OFFICE_CITY?.trim() || "";
  const publicIpRaw = process.env.OFFICE_PUBLIC_IP?.trim();
  const latRaw = process.env.OFFICE_LAT?.trim();
  const lngRaw = process.env.OFFICE_LNG?.trim();
  const radiusRaw = process.env.OFFICE_RADIUS_METERS?.trim();
  const timezone = process.env.OFFICE_TIMEZONE?.trim() || "Africa/Dar_es_Salaam";

  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;
  const radiusMeters = radiusRaw ? Number(radiusRaw) : 100;

  if (latRaw && (lat === null || Number.isNaN(lat))) {
    throw new Error("OFFICE_LAT must be a valid number");
  }
  if (lngRaw && (lng === null || Number.isNaN(lng))) {
    throw new Error("OFFICE_LNG must be a valid number");
  }
  if (Number.isNaN(radiusMeters) || radiusMeters <= 0) {
    throw new Error("OFFICE_RADIUS_METERS must be a positive number");
  }

  return {
    name,
    city,
    publicIp: publicIpRaw || null,
    lat,
    lng,
    radiusMeters,
    timezone,
  };
}

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.trim().toLowerCase());
}

export function getGoogleConfig() {
  return {
    clientId: required("GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID),
    clientSecret: required(
      "GOOGLE_CLIENT_SECRET",
      process.env.GOOGLE_CLIENT_SECRET,
    ),
    secret: required("AUTH_SECRET", process.env.AUTH_SECRET),
  };
}

export function welcomeMessage(name: string, placeOverride?: string | null): string {
  if (placeOverride?.trim()) {
    return `Welcome to ${placeOverride.trim()}, ${name}!`;
  }
  const office = getOfficeConfig();
  const place = office.city ? `${office.name}, ${office.city}` : office.name;
  return `Welcome to ${place}, ${name}!`;
}

export function goodbyeMessage(name: string): string {
  return `Goodbye ${name} — have a safe journey!`;
}

export function formatOfficeLabel(placeOverride?: string | null): string {
  if (placeOverride?.trim()) return placeOverride.trim();
  const office = getOfficeConfig();
  return office.city ? `${office.name}, ${office.city}` : office.name;
}
