"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { GoogleSignInButton, UserBadge } from "@/components/AuthButtons";
import { Spinner } from "@/components/Spinner";

export function AdminNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/auth/session", { credentials: "include" });
        if (cancelled) return;
        const data = (await res.json()) as {
          isAdmin?: boolean;
          authenticated?: boolean;
          user?: { email?: string | null };
        };
        setSignedInEmail(data.user?.email ?? null);
        setIsAdmin(Boolean(data.authenticated && data.isAdmin));
      } catch {
        if (!cancelled) {
          setSignedInEmail(null);
          setIsAdmin(false);
        }
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, status, session?.user?.email]);

  if (status === "loading" || isAdmin === null) {
    return (
      <div className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500">
        <Spinner size={14} className="text-brand-600" />
        Checking admin access…
      </div>
    );
  }

  if (!isAdmin) {
    const email = signedInEmail || session?.user?.email || null;
    return (
      <div className="mb-6 space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Admin access required</p>
        {email ? (
          <>
            <p>
              You are signed in as{" "}
              <strong className="break-all">{email}</strong>, but that email is
              not in <code>ADMIN_EMAILS</code> on Vercel.
            </p>
            <p>
              Add <strong className="break-all">{email}</strong> to{" "}
              <code>ADMIN_EMAILS</code> (comma-separated, no spaces around
              commas), save, <strong>Redeploy</strong>, then sign out and sign
              in again with the same Google account.
            </p>
          </>
        ) : (
          <p>
            Sign in with the Google account listed in{" "}
            <code>ADMIN_EMAILS</code> on Vercel.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <div className="max-w-xs flex-1">
            <GoogleSignInButton label="Sign in with Google" />
          </div>
        </div>
        <p className="text-xs text-amber-800">
          Safe check:{" "}
          <a
            className="underline"
            href="/api/auth/session"
            target="_blank"
            rel="noreferrer"
          >
            /api/auth/session
          </a>{" "}
          shows <code>isAdmin</code> for the signed-in cookie (no secrets).
        </p>
      </div>
    );
  }

  const items = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/workers", label: "Workers" },
    { href: "/admin/reports", label: "Reports" },
  ];

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
      <span className="mr-2 font-semibold text-slate-800">Admin</span>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            pathname === item.href
              ? "bg-brand-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {item.label}
        </Link>
      ))}
      <div className="ml-auto">
        <UserBadge />
      </div>
    </nav>
  );
}
