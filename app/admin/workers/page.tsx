import { requirePageCapability } from "@/lib/page-guard";
import { WorkerTable } from "@/components/WorkerTable";

export const metadata = {
  title: "Worker Accounts",
};

export const dynamic = "force-dynamic";

export default async function AdminWorkersPage() {
  await requirePageCapability("settings.manage");
  return (
    <div className="p-4 md:p-6">
      <header className="mb-4">
        <nav className="text-xs text-slate-500">Employees</nav>
        <h1 className="text-2xl font-semibold text-slate-900">Worker accounts</h1>
        <p className="mt-1 text-sm text-slate-600">
          Google-signed-in worker records, names and activation.
        </p>
      </header>
      <WorkerTable />
    </div>
  );
}
