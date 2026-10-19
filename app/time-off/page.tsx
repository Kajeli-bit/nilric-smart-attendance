import type { Metadata } from "next";
import { readPageSession } from "@/lib/page-session";
import { MyTimeOffCard } from "@/components/MyTimeOffCard";
import { SignInPanel } from "@/components/SignInPanel";
import { SetupRequiredPanel } from "@/components/SetupRequiredPanel";
import { PageBar } from "@/components/PageBar";

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
      <PageBar title="Time Off" subtitle="Requests and approvals" />

      <div className="mb-4 text-center">
        <p className="eyebrow">My workspace</p>
        <h1 className="mt-1 text-xl font-bold text-ink">Hello, {firstName}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Submit a leave request and track where it stands.
        </p>
      </div>

      <MyTimeOffCard />

      <section className="card mt-4 rounded-3xl p-5">
        <h2 className="text-sm font-semibold text-ink">How it works</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-muted">
          <li>Pick a leave type and your dates, then submit.</li>
          <li>Your request appears as <strong>To Approve</strong> for HR.</li>
          <li>Once reviewed it becomes <strong>Validated</strong> or <strong>Refused</strong>.</li>
        </ol>
        <p className="mt-3 text-xs text-ink-faint">
          Leave requests need an employee record. If the form is missing, ask HR
          to add you on the Employees page.
        </p>
      </section>
    </main>
  );
}
