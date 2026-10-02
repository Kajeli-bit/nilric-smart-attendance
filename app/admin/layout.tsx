"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminNav } from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (window.location.pathname === "/admin/login") {
        setOk(true);
        return;
      }
      try {
        const res = await fetch("/api/admin/workers", { credentials: "include" });
        if (cancelled) return;
        if (res.status === 401) {
          router.replace("/admin/login");
          return;
        }
        setOk(true);
      } catch {
        if (!cancelled) router.replace("/admin/login");
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ok) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        Checking admin access…
      </div>
    );
  }

  return (
    <main>
      <AdminNav />
      {children}
    </main>
  );
}
