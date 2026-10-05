import type { Metadata } from "next";
import Link from "next/link";
import { auth, getAuthConfigIssues } from "@/lib/auth";
import { UserBadge } from "@/components/AuthButtons";
import { BrandHeader } from "@/components/BrandHeader";
import { SignInPanel } from "@/components/SignInPanel";
import { SetupRequiredPanel } from "@/components/SetupRequiredPanel";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";

export const metadata: Metadata = {
  title: "Nilric Smart Attendance",
};

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
    console.error("home auth error", err);
    return { email: null, setupIssues };
  }
}

export default async function HomePage() {
  const { email, setupIssues } = await readSessionEmail();

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
      <BrandHeader />
      <InstallAppPrompt />
      <div className="card mt-4 space-y-4 rounded-3xl p-6">
        <UserBadge />
        <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
          <p className="font-semibold">You’re signed in</p>
          <p className="mt-1 text-brand-800">
            Location access is required for every check-in and check-out.
          </p>
        </div>
        <Link
          href="/check-in"
          className="btn-primary block rounded-2xl px-6 py-3.5 text-center font-semibold"
        >
          Open Check-In
        </Link>
      </div>
    </main>
  );
}
