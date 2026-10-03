"use client";

import { useCallback, useEffect, useState } from "react";
import type { AttendanceReportRow } from "@/lib/types";

export function AttendanceReportTable() {
  const [rows, setRows] = useState<AttendanceReportRow[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f) params.set("from", f);
      if (t) params.set("to", t);
      const res = await fetch(`/api/admin/attendance?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        setError("Admin Google sign-in required");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        rows?: AttendanceReportRow[];
      };
      setRows(data.rows ?? []);
      setError(null);
    } catch {
      setError("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/attendance`, {
        credentials: "include",
      });
      if (cancelled) return;
      if (res.status === 401 || res.status === 403) {
        setError("Admin Google sign-in required");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { rows?: AttendanceReportRow[] };
      if (cancelled) return;
      setRows(data.rows ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function csvHref() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/admin/attendance.csv?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm text-slate-600">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="ml-2 rounded-xl border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="text-sm text-slate-600">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="ml-2 rounded-xl border border-slate-300 px-2 py-1.5"
          />
        </label>
        <button
          type="button"
          onClick={() => load(from, to)}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          Apply
        </button>
        <a
          href={csvHref()}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Export CSV
        </a>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">In</th>
                <th className="px-3 py-2">Out</th>
                <th className="px-3 py-2">In method</th>
                <th className="px-3 py-2">Out method</th>
                <th className="px-3 py-2">In dist (m)</th>
                <th className="px-3 py-2">Out dist (m)</th>
                <th className="px-3 py-2">Worked (min)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={`${r.workerId}-${r.attendanceDay}-${idx}`}
                  className="border-t border-slate-100"
                >
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-slate-600">{r.email}</td>
                  <td className="px-3 py-2">{r.attendanceDay}</td>
                  <td className="px-3 py-2">{formatTime(r.checkInAt)}</td>
                  <td className="px-3 py-2">
                    {r.checkOutAt ? formatTime(r.checkOutAt) : "—"}
                  </td>
                  <td className="px-3 py-2">{r.checkInMethod}</td>
                  <td className="px-3 py-2">{r.checkOutMethod ?? "—"}</td>
                  <td className="px-3 py-2">
                    {r.checkInDistanceMeters == null
                      ? "—"
                      : Math.round(r.checkInDistanceMeters)}
                  </td>
                  <td className="px-3 py-2">
                    {r.checkOutDistanceMeters == null
                      ? "—"
                      : Math.round(r.checkOutDistanceMeters)}
                  </td>
                  <td className="px-3 py-2">{r.workedMinutes ?? "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-4 text-slate-500">
                    No attendance records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Dar_es_Salaam",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
