import type { Metadata } from "next";
import Link from "next/link";
import { auth, getAuthConfigIssues } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";
import { CheckInForm } from "@/components/CheckInForm";
import { SignInPanel } from "@/components/SignInPanel";
import { SetupRequiredPanel } from "@/components/SetupRequiredPanel";

export const metadata: Metadata = {
  title: "Check In",
};

// Session cookie must be read per request so the installed PWA always sees
// the correct signed-in / signed-out UI (no stale client session gate).
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
    console.error("check-in auth error", err);
    return { email: null, name: null, isAdmin: false, setupIssues };
  }
}

export default async function CheckInPage() {
  const { email, name, isAdmin, setupIssues } = await readSessionEmail();

  if (setupIssues.length > 0) {
    return <SetupRequiredPanel issues={setupIssues} title="Check-in setup required" />;
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
      <div
        className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 px-4 py-3 text-white rounded-b-2xl shadow-lg"
        style={{ backgroundColor: "#714B67" }}
      >
        <Link
          href="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg"
          aria-label="Back to home"
        >
          ‹
        </Link>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-wide">Attendances</p>
          <p className="text-xs text-white/70">Google sign-in · location required</p>
        </div>
        {isAdmin && (
          <Link
            href="/admin"
            className="ml-auto rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
          >
            Admin
          </Link>
        )}
      </div>

      <div className="mb-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
          Attendances
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
