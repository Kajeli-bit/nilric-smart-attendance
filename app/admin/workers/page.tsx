import { requirePageCapability } from "@/lib/page-guard";
import { ModuleHeader } from "@/components/admin/ModuleHeader";
import { WorkerTable } from "@/components/WorkerTable";

export const metadata = {
  title: "Worker Accounts",
};

export const dynamic = "force-dynamic";

export default async function AdminWorkersPage() {
  await requirePageCapability("settings.manage");
  return (
    <div className="p-4 md:p-6">
      <ModuleHeader
        section="Employees"
        title="Worker accounts"
        description="Google-signed-in worker records, names and activation."
      />
      <WorkerTable />
    </div>
  );
}
