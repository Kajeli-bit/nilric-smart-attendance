"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/admin/workers", { credentials: "include" });
        if (cancelled) return;
        setAuthed(res.status !== 401);
      } catch {
        if (!cancelled) setAuthed(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (authed === false) return null;

  const items = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/workers", label: "Workers" },
    { href: "/admin/reports", label: "Reports" },
  ];

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    router.push("/admin/login");
  }

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
      <span className="mr-2 font-semibold text-slate-800">Admin</span>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            pathname === item.href
              ? "bg-teal-700 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {item.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={logout}
        className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
      >
        Log out
      </button>
    </nav>
  );
}
