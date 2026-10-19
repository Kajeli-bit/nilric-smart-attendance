import { requirePageCapability } from "@/lib/page-guard";
import { ModuleHeader } from "@/components/admin/ModuleHeader";
import { AttendanceReportTable } from "@/components/AttendanceReportTable";

export const metadata = {
  title: "Reports",
};

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requirePageCapability("attendance.view");
  return (
    <div className="p-4 md:p-6">
      <ModuleHeader
        section="Attendances"
        title="Attendance Report"
        description="Worked hours by employee and day. CSV export follows your calendar filter."
      />
      <AttendanceReportTable />
    </div>
  );
}
