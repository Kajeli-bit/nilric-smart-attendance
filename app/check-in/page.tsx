import type { Metadata } from "next";
import Link from "next/link";
import { readPageSession } from "@/lib/page-session";
import { resolvePlatformUserForIdentity } from "@/lib/platform";
import { CheckInForm } from "@/components/CheckInForm";
import { SignInPanel } from "@/components/SignInPanel";
import { SetupRequiredPanel } from "@/components/SetupRequiredPanel";
import { PageBar } from "@/components/PageBar";

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
      <PageBar
        title="Attendance"
        subtitle="Google sign-in · location required"
        actions={
          showWorkspaceLink ? (
            <Link
              href="/admin"
              className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/25"
            >
              Management
            </Link>
          ) : null
        }
      />

      <div className="mb-4 text-center">
        <p className="eyebrow">My workspace</p>
        <h1 className="mt-1 text-xl font-bold text-ink">Hello, {firstName}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pick Head office or a project site, then check in or out.
        </p>
      </div>

      <CheckInForm />
    </main>
  );
}
