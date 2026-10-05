import type { Metadata } from "next";
import Link from "next/link";
import { auth, getAuthConfigIssues } from "@/lib/auth";
import { isAdminEmail } from "@/lib/env";
import { BrandHeader } from "@/components/BrandHeader";
import { SignInPanel } from "@/components/SignInPanel";
import { SetupRequiredPanel } from "@/components/SetupRequiredPanel";
import { CheckInForm } from "@/components/CheckInForm";

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
    return (
      <div className="app-shell app-shell-scroll">
        <SetupRequiredPanel issues={setupIssues} />
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

  return (
    <div className="app-shell">
      <BrandHeader
        title="Nilric Smart Attendance"
        subtitle={isAdmin ? "Admin + check-in" : "Check in with location"}
      />

      <CheckInForm />

      <div className="mt-2 shrink-0 space-y-2 pb-1">
        {isAdmin && (
          <Link
            href="/admin"
            className="btn-secondary flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Open Admin Panel
          </Link>
        )}
        <p className="text-center text-[10px] text-slate-400">
          GPS required · {email}
        </p>
      </div>
    </div>
  );
}
