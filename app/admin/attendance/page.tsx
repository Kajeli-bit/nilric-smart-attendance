import { requirePageCapability } from "@/lib/page-guard";
import { AttendancePageClient } from "@/components/admin/attendance/AttendancePageClient";

export const metadata = {
  title: "Attendance Records — Nilric Suite",
};

export const dynamic = "force-dynamic";

export default async function AdminAttendancePage() {
  await requirePageCapability("attendance.view");
  return <AttendancePageClient />;
}
