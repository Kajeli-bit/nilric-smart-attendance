import type { Metadata } from "next";
import { auth, getAuthConfigIssues } from "@/lib/auth";
import { CheckInForm } from "@/components/CheckInForm";
import { SignInPanel } from "@/components/SignInPanel";
import { BrandHeader } from "@/components/BrandHeader";
import { SetupRequiredPanel } from "@/components/SetupRequiredPanel";

export const metadata: Metadata = {
  title: "Check In",
};

// Session cookie must be read per request so the installed PWA always sees
// the correct signed-in / signed-out UI (no stale client session gate).
export const dynamic = "force-dynamic";

async function readSessionEmail(): Promise<{ email: string | null; setupIssues: string[] }> {
  try {
    const session = await auth();
    return {
      email: session?.user?.email?.trim().toLowerCase() ?? null,
      setupIssues: [],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const setupIssues = getAuthConfigIssues();
    if (
      setupIssues.length > 0 ||
      /AUTH_|Auth configuration|server configuration|MissingSecret/i.test(message)
    ) {
      return { email: null, setupIssues };
    }
    console.error("check-in auth error", err);
    return { email: null, setupIssues };
  }
}

export default async function CheckInPage() {
  const { email, setupIssues } = await readSessionEmail();

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

  return (
    <main className="mx-auto w-full max-w-md py-4">
      <BrandHeader
        title="Worker Attendance"
        subtitle="Google sign-in · location required"
      />
      <CheckInForm />
    </main>
  );
}
