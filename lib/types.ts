export type VerificationMethod = "office_ip" | "gps";

export type AttendanceEventType = "check_in" | "check_out";

export interface GpsCoords {
  lat: number;
  lng: number;
}

export interface Worker {
  id: string;
  employee_code: string | null;
  name: string;
  email: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDay {
  id: string;
  worker_id: string;
  attendance_day: string;
  check_in_at: string;
  check_in_method: VerificationMethod;
  check_in_ip: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_distance_m: number | null;
  check_out_at: string | null;
  check_out_method: VerificationMethod | null;
  check_out_ip: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_distance_m: number | null;
}

export interface VerificationSuccess {
  ok: true;
  method: VerificationMethod;
  distanceM: number | null;
  lat: number | null;
  lng: number | null;
}

export interface VerificationFailure {
  ok: false;
  reason: string;
}

export type VerificationResult = VerificationSuccess | VerificationFailure;

export interface AttendanceReportRow {
  workerId: string;
  employeeCode: string | null;
  name: string;
  email: string;
  attendanceDay: string;
  checkInAt: string;
  checkOutAt: string | null;
  checkInMethod: string;
  checkOutMethod: string | null;
  checkInDistanceMeters: number | null;
  checkOutDistanceMeters: number | null;
  workedMinutes: number | null;
}

export interface ApiErrorBody {
  error: string;
  message: string;
}

export interface AttendanceActionBody {
  ok: true;
  action: "check_in" | "check_out";
  worker: {
    id: string;
    name: string;
    email: string;
  };
  office: {
    name: string;
    city: string;
  };
  attendance: {
    attendanceDay: string;
    at: string;
    method: VerificationMethod;
    distanceMeters: number | null;
  };
  message: string;
}

export interface TodayStatusBody {
  ok: true;
  worker: {
    id: string;
    name: string;
    email: string;
  };
  office: {
    name: string;
    city: string;
  };
  attendanceDay: string;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInMethod: string | null;
  checkOutMethod: string | null;
  message: string | null;
}
