import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { GoogleSignInButton, UserBadge } from "@/components/AuthButtons";

export const metadata: Metadata = {
  title: "Nilric Smart Attendance",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase() ?? null;
  const signedIn = Boolean(email);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Nilric Smart Attendance
        </h1>
        <p className="mt-2 text-slate-600">
          Sign in with Google, then check in from your phone.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Location access is required for every check-in and check-out.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {signedIn ? (
          <>
            <UserBadge />
            <Link
              href="/check-in"
              className="block rounded-xl bg-teal-700 px-6 py-3 text-center font-semibold text-white hover:bg-teal-800"
            >
              Open Check-In
            </Link>
          </>
        ) : (
          <GoogleSignInButton label="Sign in with Google" />
        )}
      </div>
    </main>
  );
}
