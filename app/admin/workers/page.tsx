import { WorkerTable } from "@/components/WorkerTable";

export const metadata = {
  title: "Workers",
};

export default function AdminWorkersPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Workers</h1>
      <WorkerTable />
    </div>
  );
}
