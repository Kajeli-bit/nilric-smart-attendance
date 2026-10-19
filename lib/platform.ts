import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  can as roleCan,
  type Capability,
  type PlatformRole,
} from "@/lib/roles";
import { forbidden, unauthorized } from "@/lib/server-errors";

/**
 * V1 platform session: Google identity + Odoo-inspired role resolution.
 *
 * Resolution order:
 *  1. ADMIN_EMAILS -> platform "admin"
 *  2. employees table row matching email (active) -> that employee's role
 *  3. fallback: signed-in Google user is a plain "worker"
 */
export interface PlatformUser {
  email: string;
  name: string | null;
  image: string | null;
  role: PlatformRole;
  isAdmin: boolean;
  employeeId: string | null;
  employeeCode: string | null;
  department: string | null;
  jobTitle: string | null;
}

function baseUser(email: string, name: string | null, image: string | null): PlatformUser {
  return {
    email,
    name,
    image,
    role: "worker",
    isAdmin: false,
    employeeId: null,
    employeeCode: null,
    department: null,
    jobTitle: null,
  };
}

/**
 * Resolve a Google identity into a platform user with a role.
 *
 * Never throws: if the employees table is missing or the DB is down we
 * degrade gracefully to the ADMIN_EMAILS-derived role so admin pages and
 * worker check-in keep working.
 */
export async function resolvePlatformUserForIdentity(
  emailInput: string,
  name: string | null,
  image: string | null,
): Promise<PlatformUser> {
  const email = emailInput.trim().toLowerCase();
  if (!email) {
    const anon = baseUser("", null, null);
    anon.role = "unknown";
    return anon;
  }

  const user = baseUser(email, name, image);
  const adminEmailMatch = isAdminEmail(email);
  user.isAdmin = adminEmailMatch;

  try {
    const rows = await db.sql<{
      id: string;
      employee_code: string | null;
      role: string;
      department: string | null;
      job_title: string | null;
    }>`
      SELECT id, employee_code, role, department, job_title
      FROM employees
      WHERE email = ${email} AND active = TRUE
      LIMIT 1
    `;

    const employee = rows[0];
    if (employee) {
      user.employeeId = employee.id;
      user.employeeCode = employee.employee_code;
      user.department = employee.department;
      user.jobTitle = employee.job_title;
      if (adminEmailMatch) {
        user.role = "admin";
      } else {
        user.role = employee.role as PlatformRole;
      }
    } else if (adminEmailMatch) {
      user.role = "admin";
    }
  } catch (err) {
    // employees table missing (migration not applied) or DB issue:
    // fall back to ADMIN_EMAILS-derived role only.
    console.error("platform role resolution failed", err);
    if (adminEmailMatch) user.role = "admin";
  }

  return user;
}

/**
 * Resolve the signed-in Google user into a platform user with a role.
 *
 * Auth failures (misconfigured OAuth env, DB outages) degrade to an
 * anonymous "unknown" user instead of throwing.
 */
export async function resolvePlatformUser(): Promise<PlatformUser> {
  interface MinimalSession {
    user?: {
      email?: string | null;
      name?: string | null;
      image?: string | null;
    } | null;
  }

  let session: MinimalSession | null = null;
  try {
    session = (await auth()) as unknown as MinimalSession | null;
  } catch (err) {
    // Missing/misconfigured OAuth env (e.g. local dev) or DB outages must
    // never take the admin shell down with a 500 — degrade to anonymous.
    console.error("platform auth resolution failed", err);
  }

  return resolvePlatformUserForIdentity(
    session?.user?.email ?? "",
    session?.user?.name ?? null,
    session?.user?.image ?? null,
  );
}

/**
 * Gate an API route on a capability. Returns the platform user or a
 * NextResponse the route should return immediately.
 */
export async function requireCapability(
  capability: Capability,
): Promise<PlatformUser | NextResponse> {
  const user = await resolvePlatformUser();
  if (!user.email) return unauthorized();
  if (!roleCan(user.role, capability)) {
    return forbidden(
      `Requires the "${capability}" capability`,
      user.role,
    );
  }
  return user;
}

export function isGateResponse(value: PlatformUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
