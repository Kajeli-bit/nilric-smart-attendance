import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isGateResponse, requireCapability } from "@/lib/platform";
import { badRequest, internalError } from "@/lib/server-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAGES = [
  "new",
  "screening",
  "first_interview",
  "second_interview",
  "contract",
  "employed",
  "refused",
] as const;

type ApplicantStage = (typeof STAGES)[number];

function isStage(value: string): value is ApplicantStage {
  return (STAGES as readonly string[]).includes(value);
}

/** GET /api/admin/recruitment — applicants + open positions. */
export async function GET(request: Request) {
  const gate = await requireCapability("recruitment.view");
  if (isGateResponse(gate)) return gate;

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const stage = url.searchParams.get("stage")?.trim() ?? "";
    const positionId = url.searchParams.get("positionId")?.trim() ?? "";

    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];
    if (q) {
      params.push(`%${q}%`);
      const n = params.length;
      conditions.push(
        `(a.name ILIKE $${n} OR a.email ILIKE $${n} OR p.name ILIKE $${n})`,
      );
    }
    if (stage && isStage(stage)) {
      params.push(stage);
      conditions.push(`a.stage = $${params.length}`);
    }
    if (positionId) {
      params.push(positionId);
      conditions.push(`a.job_position_id = $${params.length}::uuid`);
    }

    params.push(1000);
    const limitIdx = params.length;

    const applicants = await db.sql.unsafe(
      `SELECT
        a.id, a.name, a.email, a.phone, a.stage,
        a.job_position_id, p.name AS position_name, p.department AS position_department,
        a.rating, a.notes, a.hired_at, a.created_at, a.updated_at
      FROM job_applicants a
      LEFT JOIN job_positions p ON p.id = a.job_position_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY
        CASE a.stage
          WHEN 'employed' THEN 7
          WHEN 'refused' THEN 6
          WHEN 'contract' THEN 5
          WHEN 'second_interview' THEN 4
          WHEN 'first_interview' THEN 3
          WHEN 'screening' THEN 2
          ELSE 0
        END,
        a.created_at DESC
      LIMIT $${limitIdx}`,
      params,
    );

    const positions = await db.sql`
      SELECT
        p.id, p.name, p.department, p.state,
        COUNT(a.id) FILTER (WHERE a.stage NOT IN ('employed','refused'))::int AS applicant_count
      FROM job_positions p
      LEFT JOIN job_applicants a ON a.job_position_id = p.id
      ORDER BY p.state ASC, p.name ASC
    `;

    return NextResponse.json({ applicants, positions });
  } catch (err) {
    console.error("recruitment list error", err);
    return internalError("Failed to load recruitment data");
  }
}

/**
 * POST /api/admin/recruitment — create an applicant or a job position.
 * Body: { kind: "applicant"|"position", ... }
 * Capability: recruitment.manage
 */
export async function POST(request: Request) {
  const gate = await requireCapability("recruitment.manage");
  if (isGateResponse(gate)) return gate;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const kind = body.kind === "position" ? "position" : "applicant";

    if (kind === "position") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const department =
        typeof body.department === "string" && body.department.trim()
          ? body.department.trim()
          : null;
      const description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
      if (!name) return badRequest("Position name is required");

      const inserted = await db.sql`
        INSERT INTO job_positions (name, department, description)
        VALUES (${name}, ${department}, ${description})
        RETURNING *
      `;
      return NextResponse.json({ position: inserted[0] }, { status: 201 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
    const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    const positionId =
      typeof body.positionId === "string" && body.positionId.trim() ? body.positionId.trim() : null;
    const stage = typeof body.stage === "string" && isStage(body.stage.trim())
      ? body.stage.trim()
      : "new";
    const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

    if (!name) return badRequest("Applicant name is required");
    if (positionId) {
      const pos = await db.sql<{ id: string }>`
        SELECT id FROM job_positions WHERE id = ${positionId}::uuid
      `;
      if (!pos[0]) return badRequest("Job position not found");
    }

    const inserted = await db.sql`
      INSERT INTO job_applicants (name, email, phone, job_position_id, stage, notes, hired_at)
      VALUES (
        ${name}, ${email}, ${phone}, ${positionId}::uuid, ${stage}, ${notes},
        ${stage === "employed" ? new Date() : null}
      )
      RETURNING *
    `;
    return NextResponse.json({ applicant: inserted[0] }, { status: 201 });
  } catch (err) {
    console.error("recruitment create error", err);
    return internalError("Failed to create recruitment record");
  }
}
