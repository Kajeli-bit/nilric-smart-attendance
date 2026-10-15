import Link from "next/link";
import { db } from "@/lib/db";
import { resolvePlatformUser } from "@/lib/platform";
import {
  can,
  roleLabel,
  type Capability,
} from "@/lib/roles";
import { formatOfficeLabel } from "@/lib/env";

export const dynamic = "force-dynamic";

interface ModuleCard {
  href: string;
  label: string;
  description: string;
  icon: string;
  capability: Capability;
  color: string;
}

const MODULES: ModuleCard[] = [
  {
    href: "/admin/employees",
    label: "Employees",
    description: "Directory, departments, managers and roles",
    icon: "🧑‍💼",
    capability: "employees.view",
    color: "bg-purple-100",
  },
  {
    href: "/admin/attendance",
    label: "Attendances",
    description: "Check-in/out records with state and corrections",
    icon: "⏱️",
    capability: "attendance.view",
    color: "bg-sky-100",
  },
  {
    href: "/admin/reports",
    label: "Attendance Report",
    description: "Worked hours by employee and day",
    icon: "📈",
    capability: "attendance.view",
    color: "bg-amber-100",
  },
  {
    href: "/admin/workers",
    label: "Worker Accounts",
    description: "Google worker records and activation",
    icon: "🪪",
    capability: "settings.manage",
    color: "bg-emerald-100",
  },
  {
    href: "/admin/sites",
    label: "Sites",
    description: "Project sites, geofences and maps",
    icon: "📍",
    capability: "settings.manage",
    color: "bg-rose-100",
  },
];

export default async function AdminOverviewPage() {
  const user = await resolvePlatformUser();

  const visible = MODULES.filter((m) => can(user.role, m.capability));

  let employeeStats: { total: number; active: number } | null = null;
  let attendanceStats: { checkedInToday: number; open: number } | null = null;

  if (can(user.role, "employees.view")) {
    try {
      const rows = await db.sql<{ total: number; active: number }>`
        SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE active)::int AS active
        FROM employees
      `;
      employeeStats = {
        total: rows[0]?.total ?? 0,
        active: rows[0]?.active ?? 0,
      };
    } catch {
      employeeStats = null;
    }
  }

  if (can(user.role, "attendance.view")) {
    try {
      const rows = await db.sql<{ checked_in: number; open: number }>`
        SELECT
          COUNT(*) FILTER (WHERE attendance_day = (NOW() AT TIME ZONE 'Africa/Dar_es_Salaam')::date)::int AS checked_in,
          COUNT(*) FILTER (
            WHERE attendance_day = (NOW() AT TIME ZONE 'Africa/Dar_es_Salaam')::date
              AND check_out_at IS NULL
          )::int AS open
        FROM attendance_days
      `;
      attendanceStats = {
        checkedInToday: rows[0]?.checked_in ?? 0,
        open: rows[0]?.open ?? 0,
      };
    } catch {
      attendanceStats = null;
    }
  }

  return (
    <div className="p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Signed in as {user.name ?? user.email} · {roleLabel(user.role)} ·{" "}
          {formatOfficeLabel()}
        </p>
      </header>

      {(employeeStats || attendanceStats) && (
        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Employees (active)"
            value={employeeStats ? `${employeeStats.active} / ${employeeStats.total}` : "—"}
          />
          <StatCard label="Checked in today" value={attendanceStats ? String(attendanceStats.checkedInToday) : "—"} />
          <StatCard label="Open records today" value={attendanceStats ? String(attendanceStats.open) : "—"} />
          <StatCard label="Your department" value={user.department ?? "—"} />
        </section>
      )}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Modules
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-xl ${m.color}`}
            >
              {m.icon}
            </span>
            <h3 className="mt-3 font-semibold text-slate-900 group-hover:text-[#714B67]">
              {m.label}
            </h3>
            <p className="mt-1 text-sm text-slate-600">{m.description}</p>
          </Link>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No admin modules for your role yet. You can check in and out from the{" "}
          <Link href="/check-in" className="font-medium text-[#714B67] underline">
            check-in screen
          </Link>
          .
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
