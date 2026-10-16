"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface MyLeave {
  id: string;
  leave_type: string;
  date_from: string;
  date_to: string;
  days: number;
  reason: string | null;
  state: string;
  decision_notes: string | null;
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

export function MyTimeOffCard() {
  const { status } = useSession();
  const [leaves, setLeaves] = useState<MyLeave[]>([]);
  const [needsEmployee, setNeedsEmployee] = useState(false);
  const [validatedDays, setValidatedDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [leaveType, setLeaveType] = useState("annual");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/my/leaves", { credentials: "include" });
      if (res.status === 401) {
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        leaves?: MyLeave[];
        needsEmployee?: boolean;
        validatedDaysThisYear?: number;
      };
      setLeaves(data.leaves ?? []);
      setNeedsEmployee(data.needsEmployee ?? false);
      setValidatedDays(data.validatedDaysThisYear ?? 0);
      setError(null);
    } catch {
      setError("Could not load your time off");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [status, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/my/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ leaveType, dateFrom, dateTo, reason }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Could not submit request");
        return;
      }
      setNotice(data.message ?? "Request submitted");
      setShowForm(false);
      setDateFrom("");
      setDateTo("");
      setReason("");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="card rounded-3xl p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">🌴 My Time Off</h2>
          <p className="text-xs text-slate-500">
            {validatedDays} day{validatedDays === 1 ? "" : "s"} validated this year
          </p>
        </div>
        {!needsEmployee && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: "#714B67" }}
          >
            {showForm ? "Cancel" : "Request"}
          </button>
        )}
      </div>

      {notice && (
        <p className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {showForm && !needsEmployee && (
        <form onSubmit={submit} className="mb-3 space-y-2 rounded-xl bg-brand-50 p-3 ring-1 ring-brand-100">
          <div className="grid grid-cols-3 gap-2">
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
            >
              {Object.entries(TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              min={today}
              onChange={(e) => setDateFrom(e.target.value)}
              required
              className="rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
            />
            <input
              type="date"
              value={dateTo}
              min={dateFrom || today}
              onChange={(e) => setDateTo(e.target.value)}
              required
              className="rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
            />
          </div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full rounded-lg border border-brand-200 bg-white px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full rounded-lg py-2 text-sm font-semibold"
          >
            {busy ? "Submitting…" : "Submit for approval"}
          </button>
        </form>
      )}

      {needsEmployee && status === "authenticated" ? (
        <p className="text-sm text-slate-600">
          Time off requests need an employee record. Ask HR to add you on the
          Employees page.
        </p>
      ) : (
        loading && <p className="text-sm text-slate-500">Loading…</p>
      )}

      {!loading && leaves.length === 0 && !needsEmployee && (
        <p className="text-sm text-slate-500">No time off requests yet.</p>
      )}

      <ul className="divide-y divide-slate-100">
        {leaves.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <div>
              <p className="font-medium text-slate-800">
                {TYPE_LABEL[l.leave_type] ?? l.leave_type} · {l.days}d
              </p>
              <p className="text-xs text-slate-500">
                {fmt(l.date_from)} → {fmt(l.date_to)}
              </p>
              {l.decision_notes && (
                <p className="text-xs text-slate-400">“{l.decision_notes}”</p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                STATE_BADGE[l.state] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {STATE_LABEL[l.state] ?? l.state}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function fmt(d: string): string {
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return d;
  }
}
