import type { Metadata } from "next";
import Link from "next/link";
import { auth, getAuthConfigIssues } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";
import { UserBadge } from "@/components/AuthButtons";
import { BrandHeader } from "@/components/BrandHeader";
import { SignInPanel } from "@/components/SignInPanel";
import { SetupRequiredPanel } from "@/components/SetupRequiredPanel";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";

export const metadata: Metadata = {
  title: "Nilric Smart Attendance",
};

export const dynamic = "force-dynamic";

async function readSessionEmail(): Promise<{
  email: string | null;
  isAdmin: boolean;
  setupIssues: string[];
}> {
  try {
    const session = await auth();
    const email = session?.user?.email?.trim().toLowerCase() ?? null;
    return {
      email,
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
      return { email: null, isAdmin: false, setupIssues };
    }
    console.error("home auth error", err);
    return { email: null, isAdmin: false, setupIssues };
  }
}

export default async function HomePage() {
  const { email, isAdmin, setupIssues } = await readSessionEmail();

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

  return (
    <main className="mx-auto w-full max-w-md py-4">
      <BrandHeader
        title="Nilric Smart Attendance"
        subtitle={
          isAdmin
            ? "You have admin access. Check in or open the admin panel."
            : "Sign in with Google, then check in from your phone."
        }
      />
      <InstallAppPrompt />

      <div className="card mt-2 space-y-5 rounded-3xl p-6">
        <UserBadge />

        <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-100">
          <p className="font-semibold">
            {isAdmin ? "Admin account" : "Worker account"}
          </p>
          <p className="mt-1 break-all text-brand-800">{email}</p>
          <p className="mt-2 text-xs leading-relaxed text-brand-800/90">
            Location access is required for every check-in and check-out.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/check-in"
            className="btn-primary flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-center font-semibold"
          >
            Open Check-In
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="btn-secondary flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-center font-semibold"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 7h16M4 12h16M4 17h10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Open Admin Panel
            </Link>
          )}
        </div>

        {isAdmin && (
          <p className="text-center text-xs text-slate-500">
            Admin pages: Overview · Workers · Reports
          </p>
        )}
      </div>
    </main>
  );
}
