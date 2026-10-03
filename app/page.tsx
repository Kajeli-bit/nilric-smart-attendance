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
      <main className="flex min-h-[70vh] items-center justify-center">
        <SignInPanel />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md">
      <BrandHeader />
      <InstallAppPrompt />
      <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <UserBadge />
        <p className="text-sm text-slate-600">
          Signed in as <strong>{email}</strong>
        </p>
        <p className="text-sm text-slate-600">
          Location access is required for every check-in and check-out.
        </p>
        <Link
          href="/check-in"
          className="block rounded-xl bg-teal-700 px-6 py-3 text-center font-semibold text-white transition hover:bg-teal-800"
        >
          Open Check-In
        </Link>
      </div>
    </main>
  );
}
