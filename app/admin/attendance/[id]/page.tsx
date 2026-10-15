import { resolvePlatformUser } from "@/lib/platform";
import { can } from "@/lib/roles";
import { AttendanceDetailClient } from "@/components/admin/attendance/AttendanceDetailClient";

export const metadata = {
  title: "Attendance Record — Nilric Suite",
};

export const dynamic = "force-dynamic";

export default async function AdminAttendanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await resolvePlatformUser();
  return (
    <AttendanceDetailClient recordId={id} canCorrect={can(user.role, "attendance.correct")} />
  );
}
