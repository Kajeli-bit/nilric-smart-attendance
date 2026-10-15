import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  isGateResponse,
  requireCapability,
} from "@/lib/platform";
import {
  badRequest,
  internalError,
  notFound,
} from "@/lib/server-errors";
import { isEmployeeRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EmployeeDetailRow {
  id: string;
  employee_code: string | null;
  name: string;
  email: string;
  role: string;
  department: string | null;
  job_title: string | null;
  manager_id: string | null;
  manager_name: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability("employees.view");
  if (isGateResponse(gate)) return gate;

  const { id } = await params;
  try {
    const rows = await db.sql<EmployeeDetailRow>`
      SELECT
        e.id, e.employee_code, e.name, e.email, e.role, e.department, e.job_title,
        e.manager_id, m.name AS manager_name, e.active, e.notes, e.created_at, e.updated_at
      FROM employees e
      LEFT JOIN employees m ON m.id = e.manager_id
      WHERE e.id = ${id}
    `;
    if (!rows[0]) return notFound("Employee not found");

    const reports = await db.sql<{ id: string; name: string; role: string }>`
      SELECT id, name, role FROM employees
      WHERE manager_id = ${id} AND active = TRUE
      ORDER BY name
    `;

    return NextResponse.json({ employee: rows[0], directReports: reports });
  } catch (err) {
    console.error("employee detail error", err);
    return internalError("Failed to load employee");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability("employees.manage");
  if (isGateResponse(gate)) return gate;

  const { id } = await params;
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const existing = await db.sql<{ id: string }>`
      SELECT id FROM employees WHERE id = ${id}
    `;
    if (!existing[0]) return notFound("Employee not found");

    const updates: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];

    if (typeof body.name === "string") {
      if (!body.name.trim()) return badRequest("Name cannot be empty");
      values.push(body.name.trim());
      updates.push(`name = $${values.length}`);
    }
    if (typeof body.role === "string") {
      if (!isEmployeeRole(body.role.trim())) {
        return badRequest("role must be one of: worker, hr, accountant, marketing, director");
      }
      values.push(body.role.trim());
      updates.push(`role = $${values.length}`);
    }
    if (typeof body.department === "string") {
      values.push(body.department.trim() || null);
      updates.push(`department = $${values.length}`);
    }
    if (typeof body.jobTitle === "string") {
      values.push(body.jobTitle.trim() || null);
      updates.push(`job_title = $${values.length}`);
    }
    if (typeof body.notes === "string") {
      values.push(body.notes.trim() || null);
      updates.push(`notes = $${values.length}`);
    }
    if ("managerId" in body) {
      const managerId =
        typeof body.managerId === "string" && body.managerId.trim()
          ? body.managerId.trim()
          : null;
      if (managerId && managerId === id) {
        return badRequest("An employee cannot manage themselves");
      }
      if (managerId) {
        const mgr = await db.sql<{ id: string; active: boolean }>`
          SELECT id, active FROM employees WHERE id = ${managerId}
        `;
        if (!mgr[0]) return badRequest("Manager not found");
        if (!mgr[0].active) return badRequest("Manager is inactive");
      }
      values.push(managerId);
      updates.push(`manager_id = $${values.length}`);
    }
    if (typeof body.active === "boolean") {
      values.push(body.active);
      updates.push(`active = $${values.length}`);
    }

    if (values.length === 0) {
      return badRequest("Nothing to update");
    }

    values.push(id);
    const rows = await db.sql.unsafe(
      `UPDATE employees SET ${updates.join(", ")}
       WHERE id = $${values.length}
       RETURNING
         id, employee_code, name, email, role, department, job_title,
         manager_id, (SELECT m.name FROM employees m WHERE m.id = employees.manager_id) AS manager_name,
         active, notes, created_at, updated_at`,
      values,
    );

    return NextResponse.json({ employee: rows[0] });
  } catch (err) {
    console.error("employee update error", err);
    return internalError("Failed to update employee");
  }
}

/** DELETE archives the employee instead of destroying data. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability("employees.manage");
  if (isGateResponse(gate)) return gate;

  const { id } = await params;
  try {
    const updated = await db.sql<{ id: string; active: boolean; name: string }>`
      UPDATE employees SET active = FALSE, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, active, name
    `;
    if (!updated[0]) return notFound("Employee not found");

    return NextResponse.json({
      employee: updated[0],
      message: `${updated[0].name} archived`,
    });
  } catch (err) {
    console.error("employee archive error", err);
    return internalError("Failed to archive employee");
  }
}
