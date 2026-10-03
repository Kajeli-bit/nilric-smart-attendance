import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { CheckInForm } from "@/components/CheckInForm";
import { GoogleSignInButton } from "@/components/AuthButtons";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";

export const metadata: Metadata = {
  title: "Check In",
};

// Session cookie must be read per request so the installed PWA always sees
// the correct signed-in / signed-out UI (no stale client session gate).
export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase() ?? null;

  return (
    <main className="mx-auto w-full max-w-md">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Worker Attendance</h1>
        <p className="mt-1 text-sm text-slate-600">
          Google sign-in · location required
        </p>
      </header>

      {email ? (
        <CheckInForm />
      ) : (
        <div className="mx-auto w-full max-w-md space-y-4">
          <InstallAppPrompt />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Sign in required
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Use your Google account to check in or out. This prevents
              credential sharing.
            </p>
            <div className="mt-4">
              <GoogleSignInButton label="Sign in with Google" />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              After signing in you can check in from this app or the website.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
