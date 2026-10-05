"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ServiceWorkerRegister />
      <div className="mx-auto w-full max-w-5xl px-4 py-6">{children}</div>
    </SessionProvider>
  );
}
