import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { UserBadge } from "@/components/AuthButtons";
import { BrandHeader } from "@/components/BrandHeader";
import { SignInPanel } from "@/components/SignInPanel";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";

export const metadata: Metadata = {
  title: "Nilric Smart Attendance",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase() ?? null;
  const signedIn = Boolean(email);

  if (!signedIn) {
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
