import type { Metadata } from "next";
import Link from "next/link";
import { auth, getAuthConfigIssues } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";
import { SignInPanel } from "@/components/SignInPanel";
import { SetupRequiredPanel } from "@/components/SetupRequiredPanel";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import { MyTimeOffCard } from "@/components/MyTimeOffCard";

export const metadata: Metadata = {
  title: "Nilric Smart Attendance",
};

export const dynamic = "force-dynamic";

async function readSessionEmail(): Promise<{
  email: string | null;
  name: string | null;
  isAdmin: boolean;
  setupIssues: string[];
}> {
  try {
    const session = await auth();
    const email = session?.user?.email?.trim().toLowerCase() ?? null;
    return {
      email,
      name: session?.user?.name ?? null,
      isAdmin: email ? isAdminEmail(email) : false,
      setupIssues: [],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const setupIssues = getAuthConfigIssues();
    if (
      setupIssues.length > 0 ||
      /AUTH_|Auth configuration|server configuration|MissingSecret/i.test(message)
    ) {
      return { email: null, name: null, isAdmin: false, setupIssues };
    }
    console.error("home auth error", err);
    return { email: null, name: null, isAdmin: false, setupIssues };
  }
}

export default async function HomePage() {
  const { email, name, isAdmin, setupIssues } = await readSessionEmail();

  if (setupIssues.length > 0) {
    return <SetupRequiredPanel issues={setupIssues} />;
  }

  if (!email) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center py-8">
        <SignInPanel />
      </main>
    );
  }

  const firstName = (name ?? email).split(/\s+/)[0] ?? "there";

  return (
    <main className="mx-auto w-full max-w-md pb-10">
      {/* Odoo-style app banner */}
      <div
        className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 px-4 py-3 text-white rounded-b-2xl shadow-lg"
        style={{ backgroundColor: "#714B67" }}
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg">
          🧭
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-wide">Nilric Suite</p>
          <p className="text-xs text-white/70">{isAdmin ? "Administrator" : "My Workspace"}</p>
        </div>
        <span
          className="ml-auto inline-grid h-9 w-9 place-items-center rounded-full bg-white/15 text-xs font-semibold"
          title={email}
        >
          {firstName.slice(0, 2).toUpperCase()}
        </span>
      </div>

      <InstallAppPrompt />

      {/* Greeting */}
      <div className="card mt-2 rounded-3xl p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
          Welcome back
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">
          Hello, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Holiday check-ins, attendance and time off — all in one place.
        </p>
      </div>

      {/* Module tiles, Odoo app grid style */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href="/check-in"
          className="card group flex flex-col items-center rounded-2xl p-4 text-center transition-transform hover:-translate-y-0.5"
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-purple-400 to-[#714B67] text-xl">
            ⏱️
          </span>
          <span className="mt-2 text-sm font-semibold text-slate-800">
            Check In / Out
          </span>
          <span className="text-xs text-slate-500">GPS-verified attendance</span>
        </Link>

        <a
          href="#my-time-off"
          className="card group flex flex-col items-center rounded-2xl p-4 text-center transition-transform hover:-translate-y-0.5"
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-[#0d8a6f] text-xl">
            🌴
          </span>
          <span className="mt-2 text-sm font-semibold text-slate-800">My Time Off</span>
          <span className="text-xs text-slate-500">Leave requests</span>
        </a>
      </div>

      {isAdmin && (
        <Link
          href="/admin"
          className="card mt-3 flex items-center gap-3 rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-purple-400 to-[#714B67] text-xl">
            📊
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-800">
              Administration
            </span>
            <span className="block text-xs text-slate-500">
              Employees · Attendances · Time Off · Recruitment
            </span>
          </span>
          <span className="ml-auto text-slate-400">›</span>
        </Link>
      )}

      {/* Self-service time off */}
      <div id="my-time-off" className="mt-4 scroll-mt-24">
        <MyTimeOffCard />
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Sign in: {email}
      </p>
    </main>
  );
}
