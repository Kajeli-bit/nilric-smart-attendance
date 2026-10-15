"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import type { MenuGroup, PlatformRole } from "@/lib/roles";
import { roleLabel } from "@/lib/roles";

/**
 * Odoo-inspired sidebar: purple brand bar, groups with items, user badge.
 */
export function AdminSidebar({
  groups,
  role,
  email,
  name,
}: {
  groups: MenuGroup[];
  role: PlatformRole;
  email: string;
  name: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const initials = (name ?? email)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "U";

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-purple-900/30 bg-[#714B67] px-4 py-3 text-white md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-white/30 px-2 py-1 text-sm"
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <a href="/admin" className="font-semibold tracking-wide">
          Nilric Suite
        </a>
        <span className="ml-auto rounded bg-white/10 px-2 py-0.5 text-xs">
          {roleLabel(role)}
        </span>
      </div>

      <aside
        className={`${
          open ? "block" : "hidden"
        } w-full shrink-0 border-r border-purple-950/20 bg-white md:block md:w-[240px]`}
      >
        <div className="flex h-full flex-col">
          {/* Brand */}
          <a
            href="/admin"
            className="hidden items-center gap-2 bg-[#714B67] px-4 py-4 text-white md:flex"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-lg">
              🧰
            </span>
            <span className="text-base font-semibold tracking-wide">
              Nilric Suite
            </span>
          </a>

          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {groups.map((group) => (
              <div key={group.key} className="mb-4">
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-purple-900/60">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.key === "overview" ? (
                    <li>
                      <DashboardLink active={pathname === "/admin"} />
                    </li>
                  ) : (
                    group.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                              active
                                ? "bg-purple-100 font-medium text-[#5b3a51]"
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            ))}
          </nav>

          {/* User badge */}
          <div className="border-t border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#714B67] text-sm font-semibold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {name ?? email}
                </p>
                <p className="truncate text-xs text-purple-800">
                  {roleLabel(role)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function DashboardLink({ active }: { active: boolean }) {
  return (
    <Link
      href="/admin"
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-purple-100 font-medium text-[#5b3a51]"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      Dashboard
    </Link>
  );
}
