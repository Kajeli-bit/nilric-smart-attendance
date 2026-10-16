"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import type { ReactNode } from "react";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

/**
 * App-wide session + service-worker providers.
 *
 * The old worker PWA pages were designed inside a centered max-w column,
 * but the admin shell (Odoo-style console at /admin) must span the full
 * viewport — so the centered wrapper is applied everywhere EXCEPT /admin.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <SessionProvider>
      <ServiceWorkerRegister />
      {isAdmin ? (
        <Fragment>{children}</Fragment>
      ) : (
        <div className="mx-auto w-full max-w-5xl px-4 py-6">{children}</div>
      )}
    </SessionProvider>
  );
}
