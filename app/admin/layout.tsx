import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { resolvePlatformUser } from "@/lib/platform";
import { menuForRole } from "@/lib/roles";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "Administration — Nilric Suite",
};

export const dynamic = "force-dynamic";

/**
 * Odoo-inspired admin shell.
 *
 * Google SSO is mandatory: signed-out visitors land on the app launcher
 * sign-in gate. Plain workers (no management capabilities) are also sent
 * back to the launcher, where only their self-service apps are listed.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await resolvePlatformUser();
  if (!user.email) redirect("/");

  const groups = menuForRole(user.role);
  const hasManagementModules = groups.some((group) => group.items.length > 0);
  if (!hasManagementModules) redirect("/");

  return (
    <AdminSidebar
      groups={groups}
      role={user.role}
      email={user.email}
      name={user.name}
    >
      {children}
    </AdminSidebar>
  );
}
