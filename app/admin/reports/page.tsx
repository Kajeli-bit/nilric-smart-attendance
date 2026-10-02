import { AttendanceReportTable } from "@/components/AttendanceReportTable";

export const metadata = {
  title: "Reports",
};

export default function AdminReportsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Attendance reports</h1>
      <AttendanceReportTable />
    </div>
  );
}
