import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  isGateResponse,
  requireCapability,
} from "@/lib/platform";
import { badRequest, internalError } from "@/lib/server-errors";
import { isEmployeeRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/employees — Odoo-style searchable employee list.
 * Capability: employees.view
 */
export async function GET(request: Request) {
  const gate = await requireCapability("employees.view");
  if (isGateResponse(gate)) return gate;

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const role = url.searchParams.get("role")?.trim() ?? "";
    const active = url.searchParams.get("active")?.trim() ?? "";

    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];

    if (q) {
      params.push(`%${q}%`);
      const n = params.length;
      conditions.push(
        `(e.name ILIKE $${n} OR e.email ILIKE $${n} OR e.employee_code ILIKE $${n} OR e.department ILIKE $${n})`,
      );
    }
    if (role) {
      params.push(role);
      conditions.push(`e.role = $${params.length}`);
    }
    if (active === "true" || active === "false") {
      params.push(active === "true");
      conditions.push(`e.active = $${params.length}`);
    }

    params.push(1000);
    const limitIdx = params.length;

    const rows = await db.sql.unsafe(
      `SELECT
        e.id,
        e.employee_code,
        e.name,
        e.email,
        e.role,
        e.department,
        e.job_title,
        e.manager_id,
        m.name AS manager_name,
        e.active,
        e.notes,
        e.created_at,
        e.updated_at
      FROM employees e
      LEFT JOIN employees m ON m.id = e.manager_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY e.active DESC, e.name ASC
      LIMIT $${limitIdx}`,
      params,
    );

    return NextResponse.json({ employees: rows });
  } catch (err) {
    console.error("employees list error", err);
    return internalError("Failed to load employees");
  }
}

/**
 * POST /api/admin/employees — create an employee record.
 * Capability: employees.manage
 */
export async function POST(request: Request) {
  const gate = await requireCapability("employees.manage");
  if (isGateResponse(gate)) return gate;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "worker";
    const department = typeof body.department === "string" && body.department.trim() ? body.department.trim() : null;
    const jobTitle = typeof body.jobTitle === "string" && body.jobTitle.trim() ? body.jobTitle.trim() : null;
    const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
    const managerId = typeof body.managerId === "string" && body.managerId.trim() ? body.managerId.trim() : null;
    const employeeCode =
      typeof body.employeeCode === "string" && body.employeeCode.trim()
        ? body.employeeCode.trim()
        : null;

    if (!name) return badRequest("Name is required");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return badRequest("A valid email is required");
    }
    if (!isEmployeeRole(role)) {
      return badRequest(`role must be one of: worker, hr, accountant, marketing, director`);
    }

    if (managerId) {
      const mgr = await db.sql<{ id: string; active: boolean }>`
        SELECT id, active FROM employees WHERE id = ${managerId}
      `;
      if (!mgr[0]) return badRequest("Manager not found");
    }

    const existing = await db.sql<{ id: string }>`
      SELECT id FROM employees WHERE email = ${email}
    `;
    if (existing[0]) {
      return NextResponse.json(
        { error: "CONFLICT", message: "An employee with this email already exists" },
        { status: 409 },
      );
    }

    const inserted = await db.sql<{
      id: string;
      employee_code: string | null;
      name: string;
      email: string;
      role: string;
      department: string | null;
      job_title: string | null;
      manager_id: string | null;
      active: boolean;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>`
      INSERT INTO employees (name, email, role, department, job_title, manager_id, active, notes, employee_code)
      VALUES (${name}, ${email}, ${role}, ${department}, ${jobTitle}, ${managerId}, TRUE, ${notes}, ${employeeCode})
      RETURNING id, employee_code, name, email, role, department, job_title, manager_id, active, notes, created_at, updated_at
    `;

    return NextResponse.json({ employee: inserted[0] }, { status: 201 });
  } catch (err) {
    console.error("employee create error", err);
    return internalError("Failed to create employee");
  }
}
