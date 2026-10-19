import { requirePageCapability } from "@/lib/page-guard";
import { SiteAdmin } from "@/components/admin/SiteAdmin";

export const metadata = {
  title: "Sites",
};

export const dynamic = "force-dynamic";

export default async function AdminSitesPage() {
  await requirePageCapability("settings.manage");
  return (
    <div className="p-4 md:p-6">
      <header className="mb-4">
        <nav className="text-xs text-slate-500">Attendances</nav>
        <h1 className="text-2xl font-semibold text-slate-900">Project sites</h1>
        <p className="mt-1 text-sm text-slate-600">
          Register remote sites and their geofences for worker check-in.
        </p>
      </header>
      <SiteAdmin />
    </div>
  );
}
