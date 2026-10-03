import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { CheckInForm } from "@/components/CheckInForm";
import { SignInPanel } from "@/components/SignInPanel";
import { BrandHeader } from "@/components/BrandHeader";

export const metadata: Metadata = {
  title: "Check In",
};

// Session cookie must be read per request so the installed PWA always sees
// the correct signed-in / signed-out UI (no stale client session gate).
export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase() ?? null;

  if (!email) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <SignInPanel />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md">
      <BrandHeader
        title="Worker Attendance"
        subtitle="Google sign-in · location required"
      />
      <CheckInForm />
    </main>
  );
}
