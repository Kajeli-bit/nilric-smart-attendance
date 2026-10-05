"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ServiceWorkerRegister />
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden px-3 py-2">
        {children}
      </div>
    </SessionProvider>
  );
}
