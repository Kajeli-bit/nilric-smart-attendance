import type { ReactNode } from "react";
import Link from "next/link";
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
 * Any signed-in Google worker gets the shell; menu groups are filtered by
 * the capability matrix, so workers see only the Dashboard and get a hint
 * that attendance self-service happens on the check-in screen.
 *
 * The AdminSidebar component owns the full shell: a full-width app bar,
 * then the sidebar + content row. Children are rendered into the content
 * area (or a sign-in notice when no session exists).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await resolvePlatformUser();
  const groups = menuForRole(user.role);

  return (
    <AdminSidebar
      groups={groups}
      role={user.role}
      email={user.email}
      name={user.name}
    >
      {!user.email ? (
        <div className="p-4">
          <div className="m-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Google sign-in required. Open the{" "}
            <Link href="/" className="font-semibold underline">
              home page
            </Link>{" "}
            and sign in with your Google account.
          </div>
        </div>
      ) : (
        children
      )}
    </AdminSidebar>
  );
}
