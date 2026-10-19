"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ModuleHeader } from "@/components/admin/ModuleHeader";

interface AttendanceListRow {
  id: string | null;
  state: string;
  name: string;
  email: string;
  employeeCode: string | null;
  employeeName: string;
  employeeRole: string | null;
  employeeDepartment: string | null;
  attendanceDay: string;
  checkInAt: string;
  checkOutAt: string | null;
  checkInMethod: string;
  checkOutMethod: string | null;
  workedMinutes: number | null;
}

const STATE_BADGE: Record<string, string> = {
  open: "bg-sky-100 text-sky-800",
  closed: "bg-emerald-100 text-emerald-800",
  corrected: "bg-amber-100 text-amber-800",
};

function fmtTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    timeZone: "Africa/Dar_es_Salaam",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMinutes(min: number | null): string {
  if (min === null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function AttendancePageClient() {
  const [rows, setRows] = useState<AttendanceListRow[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (state) params.set("state", state);
      const res = await fetch(`/api/admin/attendance?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        setError("You do not have access to attendance records.");
        setRows([]);
        return;
      }
      const data = (await res.json()) as { rows?: AttendanceListRow[] };
      setRows(data.rows ?? []);
      setError(null);
    } catch {
      setError("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  }, [from, to, state]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="p-4 md:p-6">
      <ModuleHeader
        section="Attendances"
        title="Attendance Records"
        description="Check-in/out records per worker and day. HR and the Managing Director can correct records."
      />

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">State</span>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="input rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All states</option>
            <option value="open">Open (no check-out)</option>
            <option value="closed">Closed</option>
            <option value="corrected">Corrected</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg btn-primary px-4 py-2 text-sm font-medium"
        >
          Apply
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Day</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3">Check-out</th>
              <th className="px-4 py-3">Worked</th>
              <th className="px-4 py-3">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No attendance records found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id ?? `${row.email}-${row.attendanceDay}`} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  {row.id ? (
                    <Link
                      href={`/admin/attendance/${row.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {row.employeeName || row.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-700">
                      {row.employeeName || row.name}
                    </span>
                  )}
                  <div className="text-xs text-slate-500">
                    {[row.employeeDepartment || row.employeeRole, row.employeeCode || row.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{row.attendanceDay}</td>
                <td className="px-4 py-3 text-slate-700">
                  {fmtTime(row.checkInAt)}
                  <div className="text-xs text-slate-500">{row.checkInMethod}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {fmtTime(row.checkOutAt)}
                  {row.checkOutMethod ? (
                    <div className="text-xs text-slate-500">{row.checkOutMethod}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-700">{fmtMinutes(row.workedMinutes)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_BADGE[row.state] ?? "bg-slate-100 text-slate-700"}`}>
                    {row.state}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
