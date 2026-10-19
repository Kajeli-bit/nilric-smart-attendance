import type { Metadata } from "next";
import Link from "next/link";
import { readPageSession } from "@/lib/page-session";
import { MyTimeOffCard } from "@/components/MyTimeOffCard";
import { SignInPanel } from "@/components/SignInPanel";
import { SetupRequiredPanel } from "@/components/SetupRequiredPanel";

export const metadata: Metadata = {
  title: "My Time Off",
};

export const dynamic = "force-dynamic";

export default async function TimeOffPage() {
  const session = await readPageSession();

  if (session.setupIssues.length > 0) {
    return <SetupRequiredPanel issues={session.setupIssues} title="Time off setup required" />;
  }

  if (!session.email) {
    return <SignInPanel />;
  }

  const firstName = (session.name ?? session.email).split(/\s+/)[0] ?? "there";

  return (
    <main className="mx-auto w-full max-w-2xl pb-10">
      <div
        className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 px-4 py-3 text-white rounded-b-2xl shadow-lg"
        style={{ backgroundColor: "#714B67" }}
      >
        <Link
          href="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg"
          aria-label="Back to all apps"
        >
          ‹
        </Link>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-wide">Time Off</p>
          <p className="text-xs text-white/70">Requests and approvals</p>
        </div>
      </div>

      <div className="mb-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-600">
          My workspace
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">
          Hello, {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Submit a leave request and track where it stands.
        </p>
      </div>

      <MyTimeOffCard />

      <section className="card mt-4 rounded-3xl p-5">
        <h2 className="text-sm font-semibold text-slate-900">How it works</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Pick a leave type and your dates, then submit.</li>
          <li>Your request appears as <strong>To Approve</strong> for HR.</li>
          <li>Once reviewed it becomes <strong>Validated</strong> or <strong>Refused</strong>.</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Leave requests need an employee record. If the form is missing, ask HR
          to add you on the Employees page.
        </p>
      </section>
    </main>
  );
}
