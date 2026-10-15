/**
 * V1 platform roles and capabilities (Odoo-inspired access groups).
 *
 * DB source of truth: employees.role (worker|hr|accountant|marketing|director).
 * ADMIN_EMAILS maps to the platform "admin" role, which keeps system settings.
 */

export const PLATFORM_ROLES = [
  "worker",
  "hr",
  "accountant",
  "marketing",
  "director",
  "admin",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number] | "unknown";

/** Employee-record role values (admin is reserved for ADMIN_EMAILS). */
export const EMPLOYEE_ROLES = [
  "worker",
  "hr",
  "accountant",
  "marketing",
  "director",
] as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export const CAPABILITIES = [
  "employees.view",
  "employees.manage",
  "attendance.view",
  "attendance.correct",
  "settings.manage",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const CAPABILITY_MATRIX: Record<
  (typeof PLATFORM_ROLES)[number],
  Capability[]
> = {
  worker: [],
  hr: [
    "employees.view",
    "employees.manage",
    "attendance.view",
    "attendance.correct",
  ],
  accountant: ["employees.view", "attendance.view"],
  marketing: ["employees.view"],
  director: ["employees.view", "attendance.view", "attendance.correct"],
  admin: [
    "employees.view",
    "employees.manage",
    "attendance.view",
    "attendance.correct",
    "settings.manage",
  ],
};

export function can(
  role: PlatformRole,
  capability: Capability,
): boolean {
  if (role === "unknown") return false;
  return CAPABILITY_MATRIX[role].includes(capability);
}

export function roleLabel(role: PlatformRole | string): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "hr":
      return "HR Officer";
    case "accountant":
      return "Accountant";
    case "marketing":
      return "Marketing";
    case "director":
      return "Managing Director";
    case "worker":
      return "Worker";
    default:
      return "Signed in";
  }
}

export function isAdminRole(role: PlatformRole): boolean {
  return role === "admin";
}

export function isEmployeeRole(value: string): value is EmployeeRole {
  return (EMPLOYEE_ROLES as readonly string[]).includes(value);
}

export interface MenuItem {
  href: string;
  label: string;
  description: string;
  capability: Capability;
}

export interface MenuGroup {
  key: string;
  label: string;
  items: MenuItem[];
}

/**
 * Odoo-inspired admin menu; filtered per capability when rendered.
 */
export const MENU: MenuGroup[] = [
  {
    key: "overview",
    label: "Overview",
    items: [],
  },
  {
    key: "attendances",
    label: "Attendances",
    items: [
      {
        href: "/admin/attendance",
        label: "Attendance Records",
        description: "Check-in/out records with corrections",
        capability: "attendance.view",
      },
      {
        href: "/admin/reports",
        label: "Attendance Report",
        description: "Worked hours by employee and day",
        capability: "attendance.view",
      },
      {
        href: "/admin/sites",
        label: "Sites",
        description: "Project sites and geofences",
        capability: "settings.manage",
      },
    ],
  },
  {
    key: "employees",
    label: "Employees",
    items: [
      {
        href: "/admin/employees",
        label: "Employees",
        description: "Employee directory, roles and departments",
        capability: "employees.view",
      },
      {
        href: "/admin/workers",
        label: "Worker Accounts",
        description: "Google-signed-in worker records",
        capability: "settings.manage",
      },
    ],
  },
];

export function menuForRole(role: PlatformRole): MenuGroup[] {
  return MENU.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        role === "admin" || can(role, item.capability),
    ),
  })).filter(
    (group) => group.key === "overview" || group.items.length > 0,
  );
}
