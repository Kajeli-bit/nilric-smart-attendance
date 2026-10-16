import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isGateResponse, requireCapability } from "@/lib/platform";
import { badRequest, notFound, internalError } from "@/lib/server-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAGES = new Set([
  "new",
  "screening",
  "first_interview",
  "second_interview",
  "contract",
  "employed",
  "refused",
]);

/** GET /api/admin/recruitment/[id] — applicant detail. Capability: recruitment.view */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability("recruitment.view");
  if (isGateResponse(gate)) return gate;

  const { id } = await params;
  try {
    const rows = await db.sql`
      SELECT
        a.*,
        p.name AS position_name,
        p.department AS position_department
      FROM job_applicants a
      LEFT JOIN job_positions p ON p.id = a.job_position_id
      WHERE a.id = ${id}::uuid
    `;
    if (!rows[0]) return notFound("Applicant not found");
    return NextResponse.json({ applicant: rows[0] });
  } catch (err) {
    console.error("applicant detail error", err);
    return internalError("Failed to load applicant");
  }
}

/**
 * PATCH /api/admin/recruitment/[id] — move applicant between pipeline stages,
 * set rating or notes. Body: { stage?, rating?, notes?, name?, email?, phone? }
 * Capability: recruitment.manage
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability("recruitment.manage");
  if (isGateResponse(gate)) return gate;

  const { id } = await params;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const stage = typeof body.stage === "string" ? body.stage.trim() : null;
    const notes = "notes" in body ? (typeof body.notes === "string" ? body.notes.trim() : null) : undefined;
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const email = typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase()
      : undefined;
    const phone = "phone" in body && typeof body.phone === "string" ? body.phone.trim() : undefined;
    const rating =
      body.rating === null || body.rating === undefined
        ? undefined
        : typeof body.rating === "number"
          ? Math.round(body.rating)
          : undefined;

    if (!stage && notes === undefined && name === undefined && email === undefined && phone === undefined && rating === undefined) {
      return badRequest("Nothing to update");
    }
    if (stage && !STAGES.has(stage)) {
      return badRequest("stage must be one of: new, screening, first_interview, second_interview, contract, employed, refused");
    }
    if (rating !== undefined && (rating < 0 || rating > 3)) {
      return badRequest("rating must be between 0 and 3");
    }

    const existing = await db.sql<{ id: string; hired_at: string | null }>`
      SELECT id, hired_at FROM job_applicants WHERE id = ${id}::uuid
    `;
    if (!existing[0]) return notFound("Applicant not found");

    const sets: string[] = [];
    const vals: unknown[] = [];
    if (stage) {
      vals.push(stage);
      sets.push(`stage = $${vals.length}`);
      if (stage === "employed" && !existing[0].hired_at) {
        vals.push(new Date());
        sets.push(`hired_at = $${vals.length}`);
      }
      if (stage !== "employed" && existing[0].hired_at) {
        valNull(sets, vals, "hired_at");
      }
    }
    if (notes !== undefined) {
      vals.push(notes);
      sets.push(`notes = $${vals.length}`);
    }
    if (name !== undefined) {
      if (!name) return badRequest("Name cannot be empty");
      vals.push(name);
      sets.push(`name = $${vals.length}`);
    }
    if (email !== undefined) {
      vals.push(email);
      sets.push(`email = $${vals.length}`);
    }
    if (phone !== undefined) {
      vals.push(phone || null);
      sets.push(`phone = $${vals.length}`);
    }
    if (rating !== undefined) {
      vals.push(rating);
      sets.push(`rating = $${vals.length}`);
    }
    vals.push(new Date());
    sets.push(`updated_at = $${vals.length}`);
    vals.push(id);
    const idIdx = vals.length;

    const updated = await db.sql.unsafe(
      `UPDATE job_applicants SET ${sets.join(", ")}
       WHERE id = $${idIdx}::uuid
       RETURNING *`,
      vals,
    );

    return NextResponse.json({
      applicant: updated[0],
      message: stage === "employed" ? "Applicant hired" : stage ? "Stage updated" : "Applicant updated",
    });
  } catch (err) {
    console.error("applicant update error", err);
    return internalError("Failed to update applicant");
  }
}

function valNull(sets: string[], vals: unknown[], column: string): void {
  sets.push(`${column} = NULL`);
}
