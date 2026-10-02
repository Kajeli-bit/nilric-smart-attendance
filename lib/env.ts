function required(name: string, value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export interface OfficeConfig {
  publicIp: string | null;
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
  timezone: string;
}

export function getOfficeConfig(): OfficeConfig {
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
    publicIp: publicIpRaw || null,
    lat,
    lng,
    radiusMeters,
    timezone,
  };
}

export function getAdminPassword(): string {
  return required("ADMIN_PASSWORD", process.env.ADMIN_PASSWORD);
}
