"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SerwistProvider swUrl="/serwist/sw.js">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">{children}</div>
      </SerwistProvider>
    </SessionProvider>
  );
}
