"use client";

import { useCallback, useEffect, useState } from "react";

interface LeaveRow {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_department: string | null;
  leave_type: string;
  date_from: string;
  date_to: string;
  days: number;
  reason: string | null;
  state: string;
  approver_email: string | null;
  decision_notes: string | null;
}

interface EmployeeOption {
  id: string;
  name: string;
  email: string;
}

const TYPE_LABEL: Record<string, string> = {
  annual: "Annual",
  sick: "Sick",
  unpaid: "Unpaid",
  maternity: "Maternity",
  compassionate: "Compassionate",
  other: "Other",
};

const STATE_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  to_approve: "bg-amber-100 text-amber-900",
  refused: "bg-red-100 text-red-800",
  validated: "bg-emerald-100 text-emerald-800",
};

const STATE_LABEL: Record<string, string> = {
  draft: "Draft",
  to_approve: "To Approve",
  refused: "Refused",
  validated: "Validated",
};

type Filter = "all" | "to_approve" | "validated" | "refused" | "draft";

export function TimeOffPageClient({
  canManage,
  viewerEmail,
}: {
  canManage: boolean;
  viewerEmail: string;
}) {
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("state", filter);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/leaves?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        setError("You do not have access to Time Off.");
        setRows([]);
        return;
      }
      const data = (await res.json()) as { leaves?: LeaveRow[] };
      setRows(data.leaves ?? []);
      setError(null);
    } catch {
      setError("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  }, [filter, q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (!canManage) return;
    void (async () => {
      try {
        const res = await fetch("/api/admin/employees?active=true", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          employees?: { id: string; name: string; email: string }[];
        };
        setEmployees(data.employees ?? []);
      } catch {
        // ignore
      }
    })();
  }, [canManage]);

  async function decide(id: string, state: "validated" | "refused" | "to_approve" | "draft") {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/leaves/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ state }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Update failed");
        return;
      }
      setNotice(data.message ?? "Leave updated");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setBusyId(null);
    }
  }

  const counts: Record<string, number> = {
    to_approve: rows.filter((r) => r.state === "to_approve").length,
    validated: rows.filter((r) => r.state === "validated").length,
    refused: rows.filter((r) => r.state === "refused").length,
    draft: rows.filter((r) => r.state === "draft").length,
    all: rows.length,
  };

  return (
    <div className="p-4 md:p-6">
      {/* Control panel header, Odoo style */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav className="text-xs text-slate-500">Time Off</nav>
          <h1 className="text-2xl font-semibold text-slate-900">Time Off</h1>
          <p className="mt-1 text-sm text-slate-600">
            Leave requests and approvals. HR and the Managing Director approve
            or refuse.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            style={{ backgroundColor: "#714B67" }}
          >
            {showCreate ? "Cancel" : "+ New"}
          </button>
        )}
      </div>

      {notice && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}

      {showCreate && canManage && (
        <CreateLeave
          employees={employees}
          onCreated={(msg) => {
            setShowCreate(false);
            setNotice(msg);
            void load();
          }}
        />
      )}

      {/* Filter bar like Odoo's facet bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "All"],
            ["to_approve", "To Approve"],
            ["validated", "Validated"],
            ["refused", "Refused"],
            ["draft", "Draft"],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className="rounded-full border px-3 py-1.5 text-sm transition-colors"
            style={
              filter === key
                ? { backgroundColor: "#714B67", borderColor: "#714B67", color: "#fff" }
                : { borderColor: "#d8d4e2", color: "#475569" }
            }
            aria-pressed={filter === key}
          >
            {label}
            {key !== "all" ? ` · ${counts[key]}` : ""}
          </button>
        ))}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search employee, reason…"
          className="ml-auto w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Employee</th>
              <th className="px-4 py-2.5 text-left font-semibold">Type</th>
              <th className="px-4 py-2.5 text-left font-semibold">From</th>
              <th className="px-4 py-2.5 text-left font-semibold">To</th>
              <th className="px-4 py-2.5 text-right font-semibold">Days</th>
              <th className="px-4 py-2.5 text-left font-semibold">Status</th>
              {canManage && (
                <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                  Loading leave requests…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                  No leave requests found.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-900">{r.employee_name}</p>
                    <p className="text-xs text-slate-500">
                      {r.employee_department ?? "—"} · {r.employee_email}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {TYPE_LABEL[r.leave_type] ?? r.leave_type}
                    {r.reason ? (
                      <p className="truncate text-xs text-slate-500" title={r.reason}>
                        {r.reason}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{fmtDate(r.date_from)}</td>
                  <td className="px-4 py-2.5 text-slate-700">{fmtDate(r.date_to)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-700">{r.days}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATE_BADGE[r.state] ?? "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {STATE_LABEL[r.state] ?? r.state}
                    </span>
                    {r.approver_email ? (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        by {r.approver_email === viewerEmail ? "you" : r.approver_email}
                      </p>
                    ) : null}
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {r.state !== "validated" && (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void decide(r.id, "validated")}
                            className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {r.state !== "refused" && (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void decide(r.id, "refused")}
                            className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Refuse
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmtDate(d: string): string {
  return d.slice(0, 10);
}

function CreateLeave({
  employees,
  onCreated,
}: {
  employees: EmployeeOption[];
  onCreated: (msg: string) => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState("annual");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ employeeId, leaveType, dateFrom, dateTo, reason }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setErr(data.message ?? "Could not create leave request");
        return;
      }
      onCreated("Leave request created");
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 rounded-xl border border-slate-200 bg-white p-4"
    >
      <p className="mb-3 text-sm font-semibold text-slate-800">New leave request</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="lg:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-600">Employee</span>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select employee…</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.email})
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-600">Type</span>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-600">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-600">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="sm:col-span-2 lg:col-span-5">
          <span className="mb-1 block text-xs font-medium text-slate-600">Reason (optional)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "#714B67" }}
        >
          {busy ? "Saving…" : "Create"}
        </button>
      </div>
    </form>
  );
}
