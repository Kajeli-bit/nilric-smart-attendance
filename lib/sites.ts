import { db } from "@/lib/db";
import type { Site, SiteInput } from "@/lib/types";

const SITE_COLUMNS =
  "id, name, address, lat, lng, radius_m, active, created_by, created_at, updated_at";

function normalizeLat(lat: number): number | null {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 ? lat : null;
}

function normalizeLng(lng: number): number | null {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180 ? lng : null;
}

function normalizeRadius(radiusM: number): number | null {
  return Number.isFinite(radiusM) && radiusM > 0 ? radiusM : null;
}

export function parseSiteInput(raw: unknown): SiteInput | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "Site payload is required" };
  }
  const body = raw as {
    name?: unknown;
    address?: unknown;
    lat?: unknown;
    lng?: unknown;
    radiusM?: unknown;
    radius_m?: unknown;
    active?: unknown;
  };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "Site name is required" };

  const lat = normalizeLat(
    typeof body.lat === "number" ? body.lat : Number(body.lat),
  );
  const lng = normalizeLng(
    typeof body.lng === "number" ? body.lng : Number(body.lng),
  );
  if (lat === null || lng === null) {
    return { error: "Valid latitude and longitude are required" };
  }

  const rawRadius =
    body.radiusM !== undefined ? body.radiusM : body.radius_m;
  const radiusM =
    rawRadius === undefined || rawRadius === null || rawRadius === ""
      ? 100
      : normalizeRadius(
          typeof rawRadius === "number" ? rawRadius : Number(rawRadius),
        );
  if (radiusM === null) {
    return { error: "Radius must be a positive number (meters)" };
  }

  return {
    name,
    address:
      typeof body.address === "string" && body.address.trim()
        ? body.address.trim()
        : null,
    lat,
    lng,
    radiusM,
    active: body.active === undefined ? true : Boolean(body.active),
  };
}

export async function listSites(options?: {
  activeOnly?: boolean;
}): Promise<Site[]> {
  if (options?.activeOnly) {
    return db.sql.unsafe<Site>(
      `SELECT ${SITE_COLUMNS} FROM sites WHERE active = TRUE ORDER BY name ASC`,
    );
  }
  return db.sql.unsafe<Site>(
    `SELECT ${SITE_COLUMNS} FROM sites ORDER BY active DESC, name ASC`,
  );
}

export async function getSiteById(id: string): Promise<Site | null> {
  const rows = await db.sql<Site>`
    SELECT id, name, address, lat, lng, radius_m, active, created_by, created_at, updated_at
    FROM sites
    WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function getActiveSiteById(id: string): Promise<Site | null> {
  const rows = await db.sql<Site>`
    SELECT id, name, address, lat, lng, radius_m, active, created_by, created_at, updated_at
    FROM sites
    WHERE id = ${id} AND active = TRUE
  `;
  return rows[0] ?? null;
}

export async function createSite(
  input: SiteInput,
  createdBy: string | null,
): Promise<Site> {
  const rows = await db.sql<Site>`
    INSERT INTO sites (name, address, lat, lng, radius_m, active, created_by)
    VALUES (
      ${input.name},
      ${input.address},
      ${input.lat},
      ${input.lng},
      ${input.radiusM},
      ${input.active},
      ${createdBy}
    )
    RETURNING id, name, address, lat, lng, radius_m, active, created_by, created_at, updated_at
  `;
  const site = rows[0];
  if (!site) throw new Error("Site insert returned no row");
  return site;
}

export async function updateSite(
  id: string,
  input: Partial<SiteInput>,
): Promise<Site | null> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    values.push(input.name);
    sets.push(`name = $${values.length}`);
  }
  if (input.address !== undefined) {
    values.push(input.address);
    sets.push(`address = $${values.length}`);
  }
  if (input.lat !== undefined) {
    values.push(input.lat);
    sets.push(`lat = $${values.length}`);
  }
  if (input.lng !== undefined) {
    values.push(input.lng);
    sets.push(`lng = $${values.length}`);
  }
  if (input.radiusM !== undefined) {
    values.push(input.radiusM);
    sets.push(`radius_m = $${values.length}`);
  }
  if (input.active !== undefined) {
    values.push(input.active);
    sets.push(`active = $${values.length}`);
  }

  if (!sets.length) {
    return getSiteById(id);
  }

  sets.push("updated_at = NOW()");
  values.push(id);

  const sql = `UPDATE sites
    SET ${sets.join(", ")}
    WHERE id = $${values.length}
    RETURNING ${SITE_COLUMNS}`;
  const rows = (await db.sql.unsafe(sql, values)) as unknown as Site[];
  return rows[0] ?? null;
}

export async function deactivateSite(id: string): Promise<Site | null> {
  return updateSite(id, { active: false });
}
