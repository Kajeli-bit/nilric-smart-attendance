"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { GoogleSignInButton, UserBadge } from "@/components/AuthButtons";

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        if (cancelled) return;
        const data = (await res.json()) as { isAdmin?: boolean; authenticated?: boolean };
        setIsAdmin(Boolean(data.authenticated && data.isAdmin));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, status, session?.user?.email]);

  if (status === "loading" || isAdmin === null) {
    return (
      <div className="mb-6 text-sm text-slate-500">Checking admin access…</div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Admin sign-in required</p>
        <p className="mt-1">
          Use a Google account listed in <code>ADMIN_EMAILS</code>.
        </p>
        <div className="mt-3 max-w-xs">
          <GoogleSignInButton label="Sign in with Google" />
        </div>
      </div>
    );
  }

  const items = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/workers", label: "Workers" },
    { href: "/admin/reports", label: "Reports" },
  ];

  async function logout() {
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/" });
  }

  void router;

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
      <div className="ml-auto flex items-center gap-2">
        <UserBadge />
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
