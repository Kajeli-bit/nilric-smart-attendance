"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, type ReactNode } from "react";
import type { MenuGroup, PlatformRole } from "@/lib/roles";
import { roleLabel } from "@/lib/roles";

const GROUP_ICONS: Record<string, string> = {
  overview: "🏠",
  attendances: "⏱️",
  timeoff: "🌴",
  recruitment: "🎯",
  employees: "🧑‍💼",
};

const OD = "var(--color-brand-700)";
const BAR_H = 52;

/**
 * Odoo 19-style web client shell.
 *
 * Renders the FULL-WIDTH purple app bar (brand + module label + user),
 * then the row below containing the modules sidebar and the page content.
 */
export function AdminSidebar({
  groups,
  role,
  email,
  name,
  children,
}: {
  groups: MenuGroup[];
  role: PlatformRole;
  email: string;
  name: string | null;
  children: ReactNode;
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

  const navItems = groups.flatMap(
    (g) => (g.key === "overview" ? [] : g.items),
  );

  return (
    <div className="min-h-screen">
      {/* ── Full-width app bar ───────────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center gap-2 px-3 py-2 text-white shadow-sm"
        style={{ backgroundColor: OD, height: BAR_H }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded p-1.5 text-white/90 hover:bg-white/10 md:hidden"
          aria-label="Toggle modules menu"
          aria-expanded={open}
        >
          ☰
        </button>

        <Link
          href="/"
          title="Open the app launcher"
          aria-label="Open the app launcher"
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
            href="/"
            className="hidden rounded-md px-2.5 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10 sm:block"
          >
            All apps
          </Link>
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
            aria-expanded={switcher}
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
            className="absolute right-2 top-16 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Apps
            </p>
            <div className="grid grid-cols-3 gap-2">
              <AppTile
                href="/"
                icon="▦"
                label="All apps"
                active={false}
                onNavigate={() => setSwitcher(false)}
              />
              <AppTile
                href="/admin"
                icon="🏠"
                label="Dashboard"
                active={pathname === "/admin"}
                onNavigate={() => setSwitcher(false)}
              />
              {navItems.map((i) => (
                <AppTile
                  key={i.href}
                  href={i.href}
                  icon={GROUP_ICONS[labelKey(i.href)] ?? "📄"}
                  label={i.label}
                  active={pathname === i.href}
                  onNavigate={() => setSwitcher(false)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar + content ─────────────────────────────── */}
      <div
        className="relative flex"
        style={{ minHeight: `calc(100vh - ${BAR_H}px)` }}
      >
        <aside
          className={`${
            open ? "block" : "hidden md:block"
          } absolute z-20 w-72 rounded-r-xl border-r border-line bg-surface-muted shadow-xl md:w-[230px] md:rounded-none md:sticky md:shadow-none`}
          style={{ top: 0, height: `calc(100vh - ${BAR_H}px)` }}
        >
          <div className="flex h-full flex-col">
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {groups.map((group) => (
                <div key={group.key} className="mb-4">
                  <p className="flex items-center gap-1.5 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-900/60">
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
                        <SideLink
                          href="/admin"
                          label="Dashboard"
                          active={pathname === "/admin"}
                          onNavigate={() => setOpen(false)}
                        />
                      </li>
                    ) : (
                      group.items.map((item) => (
                        <li key={item.href}>
                          <SideLink
                            href={item.href}
                            label={item.label}
                            active={
                              pathname === item.href ||
                              pathname.startsWith(item.href + "/")
                            }
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
                  <p className="truncate text-xs text-brand-800/80">
                    {roleLabel(role)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="btn-quiet mt-2 w-full rounded-md px-2 py-1.5 text-xs"
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function labelKey(href: string): string {
  // "/admin/time-off" -> "timeoff", "/admin/attendance" -> "attendances"
  const seg = href.split("/")[2] ?? "";
  if (seg === "time-off") return "timeoff";
  if (seg === "attendance") return "attendances";
  if (seg === "recruitment") return "recruitment";
  if (seg === "employees") return "employees";
  return seg;
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
          ? "bg-brand-100 font-medium text-brand-800"
          : "text-slate-700 hover:bg-brand-50"
      }`}
    >
      <span className="truncate">{label}</span>
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
          ? "border-brand-300 bg-brand-50"
          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
      }`}
    >
      <span className="inline-grid h-8 w-8 place-items-center rounded bg-brand-700 p-1.5 text-sm leading-none">
        {icon}
      </span>
      <span className="w-full truncate text-[11px] text-slate-700">{label}</span>
    </Link>
  );
}
