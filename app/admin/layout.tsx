import type { ReactNode } from "react";
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
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await resolvePlatformUser();
  const groups = menuForRole(user.role);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen flex-col md:flex-row">
        <AdminSidebar
          groups={groups}
          role={user.role}
          email={user.email}
          name={user.name}
        />
        <main className="min-w-0 flex-1">
          {!user.email ? (
            <div className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Google sign-in required. Open the home page and sign in with your
              Google account.
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
