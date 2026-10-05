import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, getAuthConfigIssues } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";
import { BrandHeader } from "@/components/BrandHeader";
import { SignInPanel } from "@/components/SignInPanel";
import { SetupRequiredPanel } from "@/components/SetupRequiredPanel";
import { CheckInForm } from "@/components/CheckInForm";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check In",
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
    console.error("check-in auth error", err);
    return { email: null, isAdmin: false, setupIssues };
  }
}

/** PWA-friendly: same single-screen hub as `/` (no scroll). */
export default async function CheckInPage() {
  const { email, isAdmin, setupIssues } = await readSessionEmail();

  if (setupIssues.length > 0) {
    return (
      <div className="app-shell app-shell-scroll">
        <SetupRequiredPanel issues={setupIssues} title="Check-in setup required" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="app-shell">
        <SignInPanel />
      </div>
    );
  }

  // Keep PWA users on one screen — same hub as home.
  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="app-shell">
      <BrandHeader
        title="Worker Attendance"
        subtitle="Google sign-in · location required"
      />
      <CheckInForm />
      <div className="mt-2 shrink-0 pb-1">
        <Link
          href="/admin"
          className="btn-secondary flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          Open Admin Panel
        </Link>
      </div>
    </div>
  );
}
