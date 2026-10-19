"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EMPLOYEE_ROLES, roleLabel } from "@/lib/roles";
import { Field, inputCls } from "@/components/admin/employees/form-fields";

interface EmployeeDetail {
  id: string;
  employee_code: string | null;
  name: string;
  email: string;
  role: string;
  department: string | null;
  job_title: string | null;
  manager_id: string | null;
  manager_name: string | null;
  active: boolean;
  notes: string | null;
}

export function EmployeeDetailClient({
  employeeId,
  canManage,
}: {
  employeeId: string;
  canManage: boolean;
}) {
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [reports, setReports] = useState<{ id: string; name: string; role: string }[]>([]);
  const [all, setAll] = useState<EmployeeDetail[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("worker");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [managerId, setManagerId] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [detailRes, allRes] = await Promise.all([
        fetch(`/api/admin/employees/${employeeId}`, { credentials: "include" }),
        fetch("/api/admin/employees?active=true", { credentials: "include" }),
      ]);
      if (detailRes.status === 401 || detailRes.status === 403) {
        setError("You do not have access to employee records.");
        return;
      }
      const data = (await detailRes.json()) as {
        employee?: EmployeeDetail;
        directReports?: { id: string; name: string; role: string }[];
      };
      const emp = data.employee;
      if (!emp) {
        setError("Employee not found.");
        return;
      }
      setEmployee(emp);
      setReports(data.directReports ?? []);
      setName(emp.name);
      setRole(emp.role);
      setDepartment(emp.department ?? "");
      setJobTitle(emp.job_title ?? "");
      setNotes(emp.notes ?? "");
      setManagerId(emp.manager_id ?? "");
      if (allRes.ok) {
        const allData = (await allRes.json()) as { employees?: EmployeeDetail[] };
        setAll(allData.employees ?? []);
      }
      setError(null);
    } catch {
      setError("Failed to load employee");
    }
  }, [employeeId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setStatus("saving");
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/employees/${employeeId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          department,
          jobTitle,
          notes,
          managerId: managerId || null,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message ?? "Failed to save");
        return;
      }
      setStatus("saved");
      setMessage("Employee updated");
      await load();
    } catch {
      setStatus("error");
      setMessage("Failed to save");
    }
  }

  async function toggleActive() {
    if (!canManage || !employee) return;
    setStatus("saving");
    try {
      const res = await fetch(`/api/admin/employees/${employeeId}`, {
        method: employee.active ? "DELETE" : "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...(employee.active ? {} : { body: JSON.stringify({ active: true }) }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setStatus("error");
        setMessage(data.message ?? "Action failed");
        return;
      }
      const data = (await res.json()) as { message?: string };
      setStatus("saved");
      setMessage(data.message ?? "Updated");
      await load();
    } catch {
      setStatus("error");
      setMessage("Action failed");
    }
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {error}{" "}
          <Link href="/admin/employees" className="underline">
            Back to employees
          </Link>
        </div>
      </div>
    );
  }

  if (!employee) {
    return <div className="p-4 md:p-6 text-sm text-slate-500">Loading…</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <nav className="mb-2 text-xs text-slate-500">
        <Link href="/admin/employees" className="hover:underline">
          Employees /
        </Link>{" "}
        <span className="text-slate-700">{employee.name}</span>
      </nav>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{employee.name}</h1>
          <p className="text-sm text-slate-600">
            {employee.email}
            {employee.employee_code ? ` · ${employee.employee_code}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            employee.active
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {employee.active ? "Active" : "Archived"}
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

      <form onSubmit={save} className="max-w-3xl rounded-xl border border-slate-200 bg-white p-4">
        <fieldset disabled={!canManage} className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              {EMPLOYEE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Department">
            <input value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Job title">
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Manager">
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {all
                .filter((o) => o.id !== employee.id)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Notes">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </Field>
        </fieldset>
        {canManage && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={status === "saving"}
              className="rounded-lg btn-primary px-4 py-2 text-sm font-medium"
            >
              {status === "saving" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={toggleActive}
              disabled={status === "saving"}
              className="btn-secondary rounded-lg px-4 py-2 text-sm disabled:opacity-50"
            >
              {employee.active ? "Archive" : "Set active"}
            </button>
          </div>
        )}
      </form>

      <section className="mt-6 max-w-3xl rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-semibold text-slate-900">Direct reports</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-500">None</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/admin/employees/${r.id}`} className="text-brand-700 hover:underline">
                  {r.name}
                </Link>
                <span className="text-slate-500">{roleLabel(r.role)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
