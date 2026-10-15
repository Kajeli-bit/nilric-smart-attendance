"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface AttendanceEvent {
  event_type: string;
  occurred_at: string;
  verification_method: string | null;
  client_ip: string | null;
  lat: number | null;
  lng: number | null;
  distance_m: number | null;
}

interface AttendanceDetailRecord {
  id: string;
  attendance_day: string;
  check_in_at: string;
  check_out_at: string | null;
  check_in_method: string | null;
  check_out_method: string | null;
  check_in_ip: string | null;
  check_out_ip: string | null;
  check_in_distance_m: number | null;
  check_out_distance_m: number | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  site_name: string | null;
  state: string;
  correction_notes: string | null;
  corrected_by_email: string | null;
  corrected_at: string | null;
  worker_name: string;
  worker_email: string;
  employee_code: string | null;
  employee_name: string | null;
  employee_role: string | null;
  employee_department: string | null;
  events: AttendanceEvent[];
}

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local expects local time; use the office timezone formatting then local parse fallback
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function fmt(value: string | null): string {
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

export function AttendanceDetailClient({
  recordId,
  canCorrect,
}: {
  recordId: string;
  canCorrect: boolean;
}) {
  const [record, setRecord] = useState<AttendanceDetailRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState("corrected");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [clearCheckOut, setClearCheckOut] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/attendance/${recordId}`, {
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        setError("You do not have access to attendance records.");
        return;
      }
      if (res.status === 404) {
        setError("Attendance record not found.");
        return;
      }
      const data = (await res.json()) as { record?: AttendanceDetailRecord };
      const rec = data.record;
      if (!rec) {
        setError("Attendance record not found.");
        return;
      }
      setRecord(rec);
      setState(rec.state);
      setCheckIn(toLocalInput(rec.check_in_at));
      setCheckOut(toLocalInput(rec.check_out_at));
      setClearCheckOut(false);
      setNotes(rec.correction_notes ?? "");
      setError(null);
    } catch {
      setError("Failed to load attendance record");
    }
  }, [recordId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canCorrect) return;
    setStatus("saving");
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        state,
        correctionNotes: notes,
        checkInAt: checkIn ? new Date(checkIn).toISOString() : undefined,
      };
      if (clearCheckOut) {
        body.checkOutAt = "";
      } else if (checkOut) {
        body.checkOutAt = new Date(checkOut).toISOString();
      }
      const res = await fetch(`/api/admin/attendance/${recordId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "Failed to correct record");
        return;
      }
      setStatus("saved");
      setMessage("Record corrected");
      await load();
    } catch {
      setStatus("error");
      setMessage("Failed to correct record");
    }
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {error}{" "}
          <Link href="/admin/attendance" className="underline">
            Back to attendance records
          </Link>
        </div>
      </div>
    );
  }

  if (!record) {
    return <div className="p-4 md:p-6 text-sm text-slate-500">Loading…</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <nav className="mb-2 text-xs text-slate-500">
        <Link href="/admin/attendance" className="hover:underline">
          Attendances /
        </Link>{" "}
        <span className="text-slate-700">{record.attendance_day}</span>
      </nav>

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {record.employee_name || record.worker_name}
          </h1>
          <p className="text-sm text-slate-600">
            {record.attendance_day} · {record.employee_code || record.worker_email}
            {record.site_name ? ` · Site: ${record.site_name}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {record.state}
        </span>
      </header>

      {message && (
        <p
          className={`mb-4 rounded px-3 py-2 text-sm ${
            status === "error"
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {message}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Record facts */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-900">Record</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Entry label="Employee">{record.employee_name || record.worker_name}</Entry>
            <Entry label="Role at work">
              {[record.employee_department, record.employee_role].filter(Boolean).join(" · ") || "—"}
            </Entry>
            <Entry label="Check-in">{fmt(record.check_in_at)}</Entry>
            <Entry label="Check-in method">{record.check_in_method ?? "—"}</Entry>
            <Entry label="Check-out">{fmt(record.check_out_at)}</Entry>
            <Entry label="Check-out method">{record.check_out_method ?? "—"}</Entry>
            <Entry label="In distance">
              {record.check_in_distance_m !== null
                ? `${Math.round(record.check_in_distance_m)} m`
                : "—"}
            </Entry>
            <Entry label="Out distance">
              {record.check_out_distance_m !== null
                ? `${Math.round(record.check_out_distance_m)} m`
                : "—"}
            </Entry>
            <Entry label="In IP">{record.check_in_ip ?? "—"}</Entry>
            <Entry label="Out IP">{record.check_out_ip ?? "—"}</Entry>
          </dl>
          {(record.correction_notes || record.corrected_by_email) && (
            <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              <p>
                <strong>Correction:</strong> {record.correction_notes || "—"}
              </p>
              <p className="mt-1">
                by {record.corrected_by_email ?? "—"} at {fmt(record.corrected_at)}
              </p>
            </div>
          )}
        </section>

        {/* Correction form (HR / Managing Director / Admin) */}
        {canCorrect ? (
          <form onSubmit={save} className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-slate-900">Correction</h2>
            <div className="space-y-3 text-sm">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">State</span>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={detailInputCls}
                >
                  <option value="open">open</option>
                  <option value="closed">closed</option>
                  <option value="corrected">corrected</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Check-in</span>
                <input
                  type="datetime-local"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className={detailInputCls}
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={clearCheckOut}
                  onChange={(e) => setClearCheckOut(e.target.checked)}
                />
                Clear check-out time
              </label>
              {!clearCheckOut && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Check-out</span>
                  <input
                    type="datetime-local"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className={detailInputCls}
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  Correction notes
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={detailInputCls}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={status === "saving"}
              className="mt-4 rounded-lg bg-[#714B67] px-4 py-2 text-sm font-medium text-white hover:bg-[#5b3a51] disabled:opacity-50"
            >
              {status === "saving" ? "Saving…" : "Save correction"}
            </button>
          </form>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Only HR, the Managing Director and Administrators can correct
            records.
          </section>
        )}
      </div>

      {/* Events */}
      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="px-4 py-3 font-semibold text-slate-900">Events</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2">Distance</th>
              <th className="px-4 py-2">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {record.events.map((ev, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-slate-700">{ev.event_type}</td>
                <td className="px-4 py-2 text-slate-700">{fmt(ev.occurred_at)}</td>
                <td className="px-4 py-2 text-slate-600">{ev.verification_method ?? "—"}</td>
                <td className="px-4 py-2 text-slate-600">
                  {ev.distance_m !== null ? `${Math.round(ev.distance_m)} m` : "—"}
                </td>
                <td className="px-4 py-2 text-slate-600">{ev.client_ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const detailInputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#714B67] focus:outline-none";

function Entry({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}
