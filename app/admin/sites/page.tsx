import { requirePageCapability } from "@/lib/page-guard";
import { ModuleHeader } from "@/components/admin/ModuleHeader";
import { SiteAdmin } from "@/components/admin/SiteAdmin";

export const metadata = {
  title: "Sites",
};

export const dynamic = "force-dynamic";

export default async function AdminSitesPage() {
  await requirePageCapability("settings.manage");
  return (
    <div className="p-4 md:p-6">
      <ModuleHeader
        section="Attendances"
        title="Project sites"
        description="Register remote sites and their geofences for worker check-in."
      />
      <SiteAdmin />
    </div>
  );
}
