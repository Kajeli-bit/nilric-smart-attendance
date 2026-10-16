"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import type { MenuGroup, PlatformRole } from "@/lib/roles";
import { roleLabel } from "@/lib/roles";

const GROUP_ICONS: Record<string, string> = {
  overview: "🏠",
  attendances: "⏱️",
  timeoff: "🌴",
  recruitment: "🎯",
  employees: "🧑‍💼",
};

const OD = "#714B67";

/**
 * Odoo 19-style web client shell:
 * purple app bar (brand + module + app switcher), left sidebar with
 * modules and sections, user badge with sign out.
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
  const [switcher, setSwitcher] = useState(false);

  // Active module label from the first path segment under /admin.
  const segment = pathname.split("/")[2] ?? "";
  const activeGroup = groups.find(
    (g) => segment && g.items.some((i) => i.href.includes(`/${segment}`)),
  );
  const moduleLabel =
    segment === "" ? "Home" : (activeGroup?.label ?? "Settings");

  const initials =
    (name ?? email)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("") || "U";

  const navItems = groups.flatMap((g) =>
    g.key === "overview" ? [] : g.items.map((i) => ({ ...i, groupLabel: g.label })),
  );

  return (
    <>
      {/* ── App bar (Odoo top strip) ───────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center gap-2 px-3 py-2 text-white"
        style={{ backgroundColor: OD }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded p-1.5 text-white/90 hover:bg-white/10 md:hidden"
          aria-label="Toggle modules menu"
        >
          ☰
        </button>

        <Link
          href="/admin"
          className="flex items-center gap-2 font-semibold whitespace-nowrap"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-white/15 text-[15px]">
            🧭
          </span>
          <span className="hidden text-[15px] tracking-wide sm:inline">
            Nilric Suite
          </span>
        </Link>

        <span className="mx-1 hidden text-white/40 md:inline">/</span>
        <span className="hidden text-sm font-medium md:inline">
          {moduleLabel}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/check-in"
            className="hidden rounded-md px-2.5 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10 sm:block"
          >
            Check in
          </Link>
          <button
            type="button"
            onClick={() => setSwitcher((v) => !v)}
            aria-label="App switcher"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-semibold text-white hover:bg-white/20"
          >
            ▦
          </button>
          <span
            title={`${name ?? email} · ${roleLabel(role)}`}
            className="hidden h-8 w-8 place-items-center rounded-full bg-white/15 text-xs font-semibold md:grid"
          >
            {initials}
          </span>
        </div>
      </header>

      {/* ── App switcher dropdown ──────────────────────────── */}
      {switcher && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setSwitcher(false)}
        >
          <div
            className="absolute right-2 top-12 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Apps
            </p>
            <div className="grid grid-cols-3 gap-2">
              <AppTile
                href="/admin"
                icon="🏠"
                label="Home"
                active={pathname === "/admin"}
                onNavigate={() => setSwitcher(false)}
              />
              {navItems.map((i) => (
                <AppTile
                  key={i.href}
                  href={i.href}
                  icon={GROUP_ICONS[labelKey(i.groupLabel)] ?? "📄"}
                  label={i.label}
                  active={pathname === i.href}
                  onNavigate={() => setSwitcher(false)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Left modules sidebar ───────────────────────────── */}
      <aside
        className={`${
          open ? "block" : "hidden"
        } w-full shrink-0 border-r border-purple-950/10 bg-[#faf9fc] md:block md:w-[230px]`}
      >
        <div className="flex h-full flex-col">
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {groups.map((group) => (
              <div key={group.key} className="mb-4">
                <p className="flex items-center gap-1.5 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-purple-900/60">
                  {group.key !== "overview" && (
                    <span aria-hidden className="text-xs">
                      {GROUP_ICONS[group.key] ?? "📄"}
                    </span>
                  )}
                  {group.key === "overview" ? "Module" : group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.key === "overview" ? (
                    <li>
                      <SideLink href="/admin" label="Dashboard" active={pathname === "/admin"} onNavigate={() => setOpen(false)} />
                    </li>
                  ) : (
                    group.items.map((item) => (
                      <li key={item.href}>
                        <SideLink
                          href={item.href}
                          label={item.label}
                          active={pathname === item.href || pathname.startsWith(item.href + "/")}
                          onNavigate={() => setOpen(false)}
                        />
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
          </nav>

          {/* User badge */}
          <div className="border-t border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: OD }}
              >
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {name ?? email}
                </p>
                <p className="truncate text-xs text-purple-800/80">
                  {roleLabel(role)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function labelKey(groupLabel: string): string {
  return groupLabel.toLowerCase().replace(/\s+/g, "");
}

function SideLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-purple-100 font-medium text-[#5b3a51]"
          : "text-slate-700 hover:bg-purple-50"
      }`}
    >
      <span className={`truncate ${active ? "" : "font-normal"}`}>{label}</span>
    </Link>
  );
}

function AppTile({
  href,
  icon,
  label,
  active,
  onNavigate,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors ${
        active
          ? "border-purple-300 bg-purple-50"
          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      <span className="h-8 w-8 rounded bg-gradient-to-br from-[#a385c1] to-[#714B67] p-1.5 text-sm leading-none inline-grid place-items-center">
        {icon}
      </span>
      <span className="w-full truncate text-[11px] text-slate-700">{label}</span>
    </Link>
  );
}
