import type { Metadata } from "next";
import Link from "next/link";
import { readPageSession } from "@/lib/page-session";
import { resolvePlatformUserForIdentity } from "@/lib/platform";
import { CheckInForm } from "@/components/CheckInForm";
import { SignInPanel } from "@/components/SignInPanel";
import { SetupRequiredPanel } from "@/components/SetupRequiredPanel";

export const metadata: Metadata = {
  title: "Attendance",
};

// Session cookie must be read per request so the installed PWA always sees
// the correct signed-in / signed-out UI (no stale client session gate).
export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const session = await readPageSession();

  if (session.setupIssues.length > 0) {
    return <SetupRequiredPanel issues={session.setupIssues} title="Check-in setup required" />;
  }

  if (!session.email) {
    return <SignInPanel />;
  }

  const user = await resolvePlatformUserForIdentity(
    session.email,
    session.name,
    session.image,
  );
  const firstName = (session.name ?? session.email).split(/\s+/)[0] ?? "there";
  const showWorkspaceLink = user.role !== "worker" && user.role !== "unknown";

  return (
    <main className="mx-auto w-full max-w-md pb-10">
      <div
        className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 px-4 py-3 text-white rounded-b-2xl shadow-lg"
        style={{ backgroundColor: "#714B67" }}
      >
        <Link
          href="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg"
          aria-label="Back to all apps"
        >
          ‹
        </Link>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-wide">Attendance</p>
          <p className="text-xs text-white/70">Google sign-in · location required</p>
        </div>
        {showWorkspaceLink && (
          <Link
            href="/admin"
            className="ml-auto rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
          >
            Management
          </Link>
        )}
      </div>

      <div className="mb-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
          Attendance
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">
          Hello, {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Pick Head office or a project site, then check in or out.
        </p>
      </div>

      <CheckInForm />
    </main>
  );
}
