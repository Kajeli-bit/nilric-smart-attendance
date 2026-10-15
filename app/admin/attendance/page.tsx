import { AttendancePageClient } from "@/components/admin/attendance/AttendancePageClient";

export const metadata = {
  title: "Attendance Records — Nilric Suite",
};

export const dynamic = "force-dynamic";

export default function AdminAttendancePage() {
  return <AttendancePageClient />;
}
