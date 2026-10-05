import { SiteAdmin } from "@/components/admin/SiteAdmin";

export const metadata = {
  title: "Sites",
};

export default function AdminSitesPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Project sites</h1>
      <SiteAdmin />
    </div>
  );
}
