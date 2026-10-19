import Image from "next/image";
import Link from "next/link";
import { roleLabel } from "@/lib/roles";
import type { PlatformUser } from "@/lib/platform";
import type { AppDefinition } from "@/lib/apps";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import { SignOutButton } from "@/components/AuthButtons";

function initialsOf(value: string): string {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

function AppTile({ app }: { app: AppDefinition }) {
  return (
    <Link
      href={app.href}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <span
        className={`grid h-14 w-14 place-items-center rounded-2xl text-2xl ${app.tone}`}
        aria-hidden="true"
      >
        {app.icon}
      </span>
      <span className="mt-4 text-base font-semibold text-slate-900 group-hover:text-brand-700">
        {app.label}
      </span>
      <span className="mt-1 text-sm leading-relaxed text-slate-500">
        {app.description}
      </span>
      <span className="mt-auto pt-4 text-xs font-semibold text-brand-600">
        Open <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

function AppSection({
  title,
  subtitle,
  apps,
}: {
  title: string;
  subtitle: string;
  apps: AppDefinition[];
}) {
  if (apps.length === 0) return null;
  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <AppTile key={app.id} app={app} />
        ))}
      </div>
    </section>
  );
}

/**
 * Post-login home for every signed-in user: an app grid filtered by the
 * capabilities of the resolved platform role.
 */
export function AppLauncher({
  user,
  workspace,
  management,
}: {
  user: PlatformUser;
  workspace: AppDefinition[];
  management: AppDefinition[];
}) {
  const displayName = user.name ?? user.email;
  const firstName = displayName.split(/\s+/)[0] ?? displayName;
  const initials = initialsOf(displayName);

  return (
    <main className="w-full pb-12">
      <InstallAppPrompt />

      <header className="relative overflow-hidden rounded-3xl bg-[#714B67] text-white shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(600px 240px at 15% -20%, rgba(255,255,255,0.28), transparent 60%), radial-gradient(520px 260px at 95% 120%, rgba(124,72,207,0.55), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 p-1.5">
                <Image
                  src="/icons/favicon.png"
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              </span>
              <div className="leading-tight">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                  Nilric Suite
                </p>
                <h1 className="text-2xl font-semibold">Your workspace</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-inset ring-white/15">
                {roleLabel(user.role)}
              </span>
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full ring-2 ring-white/25"
                />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-xs font-semibold">
                  {initials}
                </span>
              )}
              <SignOutButton className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-60" />
            </div>
          </div>

          <div>
            <p className="text-lg font-medium">Welcome back, {firstName}.</p>
            <p className="mt-1 max-w-2xl text-sm text-white/70">
              Open an app to get started. The modules below match your role —
              sign in with a different account to see a different workspace.
            </p>
            <p className="mt-3 text-xs text-white/50">{user.email}</p>
          </div>
        </div>
      </header>

      <AppSection
        title="My workspace"
        subtitle="Self-service tools available to everyone."
        apps={workspace}
      />

      <AppSection
        title="Management"
        subtitle={`Modules enabled for your ${roleLabel(user.role)} role.`}
        apps={management}
      />

      <footer className="mt-10 text-center text-xs text-slate-400">
        <p>Signed in as {user.email}</p>
        <p className="mt-0.5">
          Nilric Suite · {roleLabel(user.role)} · Google single sign-on
        </p>
      </footer>
    </main>
  );
}
