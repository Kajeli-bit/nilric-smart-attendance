import type { AttendanceReportRow } from "@/lib/types";

interface RawAttendanceRow {
  worker_id: string;
  employee_code: string;
  name: string;
  attendance_day: string | Date;
  check_in_at: string;
  check_out_at: string | null;
  check_in_method: string;
  check_out_method: string | null;
  check_in_distance_m: number | null;
  check_out_distance_m: number | null;
}

export function formatDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  // DATE columns may come back as "YYYY-MM-DD" or ISO timestamp
  return String(value).slice(0, 10);
}

function minutesBetween(a: string, b: string): number | null {
  const start = new Date(a).getTime();
  const end = new Date(b).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, Math.round((end - start) / 60000));
}

export function buildReportRows(raw: RawAttendanceRow[]): AttendanceReportRow[] {
  return raw.map((r) => ({
    workerId: r.worker_id,
    employeeCode: r.employee_code,
    name: r.name,
    attendanceDay: formatDate(r.attendance_day),
    checkInAt: r.check_in_at,
    checkOutAt: r.check_out_at,
    checkInMethod: r.check_in_method,
    checkOutMethod: r.check_out_method,
    checkInDistanceMeters: r.check_in_distance_m,
    checkOutDistanceMeters: r.check_out_distance_m,
    workedMinutes: r.check_out_at
      ? minutesBetween(r.check_in_at, r.check_out_at)
      : null,
  }));
}
