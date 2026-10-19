import { can, type Capability, type PlatformRole } from "@/lib/roles";

/**
 * Role-aware app registry for the post-login launcher.
 *
 * Every signed-in user gets the self-service "workspace" apps; the
 * management apps appear only when the resolved platform role holds the
 * required capability (see lib/roles.ts).
 */

export type AppSection = "workspace" | "management";

export interface AppDefinition {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string;
  /** Tailwind classes for the icon tile. */
  tone: string;
  section: AppSection;
  capability?: Capability;
}

const WORKSPACE_APPS: AppDefinition[] = [
  {
    id: "attendance",
    label: "Attendance",
    description: "Check in and out with location verification.",
    href: "/check-in",
    icon: "⏱️",
    tone: "bg-sky-100 text-sky-700",
    section: "workspace",
  },
  {
    id: "my-time-off",
    label: "My Time Off",
    description: "Request leave and follow your approvals.",
    href: "/time-off",
    icon: "🌴",
    tone: "bg-teal-100 text-teal-700",
    section: "workspace",
  },
];

const MANAGEMENT_APPS: AppDefinition[] = [
  {
    id: "attendance-records",
    label: "Attendances",
    description: "Review, filter and correct daily records.",
    href: "/admin/attendance",
    icon: "🗂️",
    tone: "bg-indigo-100 text-indigo-700",
    section: "management",
    capability: "attendance.view",
  },
  {
    id: "attendance-report",
    label: "Attendance Report",
    description: "Worked hours by employee and day, with CSV export.",
    href: "/admin/reports",
    icon: "📈",
    tone: "bg-amber-100 text-amber-700",
    section: "management",
    capability: "attendance.view",
  },
  {
    id: "employees",
    label: "Employees",
    description: "Directory, departments, managers and roles.",
    href: "/admin/employees",
    icon: "🧑‍💼",
    tone: "bg-purple-100 text-purple-700",
    section: "management",
    capability: "employees.view",
  },
  {
    id: "time-off",
    label: "Time Off",
    description: "Approve or refuse leave requests.",
    href: "/admin/time-off",
    icon: "✅",
    tone: "bg-emerald-100 text-emerald-700",
    section: "management",
    capability: "leaves.view",
  },
  {
    id: "recruitment",
    label: "Recruitment",
    description: "Job positions and the hiring pipeline.",
    href: "/admin/recruitment",
    icon: "🎯",
    tone: "bg-orange-100 text-orange-700",
    section: "management",
    capability: "recruitment.view",
  },
  {
    id: "sites",
    label: "Sites",
    description: "Register project sites and geofences.",
    href: "/admin/sites",
    icon: "📍",
    tone: "bg-rose-100 text-rose-700",
    section: "management",
    capability: "settings.manage",
  },
  {
    id: "worker-accounts",
    label: "Worker Accounts",
    description: "Google accounts, names and activation.",
    href: "/admin/workers",
    icon: "🪪",
    tone: "bg-slate-200 text-slate-700",
    section: "management",
    capability: "settings.manage",
  },
];

export function workspaceApps(): AppDefinition[] {
  return WORKSPACE_APPS;
}

export function managementAppsForRole(role: PlatformRole): AppDefinition[] {
  return MANAGEMENT_APPS.filter(
    (app) => !app.capability || can(role, app.capability),
  );
}

export function appsForRole(role: PlatformRole): AppDefinition[] {
  return [...workspaceApps(), ...managementAppsForRole(role)];
}
