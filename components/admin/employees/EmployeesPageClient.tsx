"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EMPLOYEE_ROLES, roleLabel } from "@/lib/roles";
import { ModuleHeader } from "@/components/admin/ModuleHeader";

interface EmployeeRow {
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

const ROLE_BADGE: Record<string, string> = {
  worker: "bg-slate-100 text-slate-700",
  hr: "bg-brand-100 text-brand-800",
  accountant: "bg-emerald-100 text-emerald-800",
  marketing: "bg-amber-100 text-amber-800",
  director: "bg-indigo-100 text-indigo-800",
};

export function EmployeesPageClient({ canManage }: { canManage: boolean }) {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (roleFilter) params.set("role", roleFilter);
      if (activeFilter) params.set("active", activeFilter);
      const res = await fetch(`/api/admin/employees?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        setError("You do not have access to the employee directory.");
        setRows([]);
        return;
      }
      const data = (await res.json()) as { employees?: EmployeeRow[] };
      setRows(data.employees ?? []);
      setError(null);
    } catch {
      setError("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter, activeFilter]);

  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <div className="p-4 md:p-6">
      <ModuleHeader
        section="Employees"
        title="Employees"
        description="Employee directory with departments, managers and platform roles."
        actions={
          canManage ? (
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
            >
              {showCreate ? "Cancel" : "+ New"}
            </button>
          ) : undefined
        }
      />

      {showCreate && canManage && (
        <CreateEmployee
          onCreated={(msg) => {
            setShowCreate(false);
            setNotice(msg);
            void load();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}

      {/* Odoo-style filter bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, code, department…"
          className="input w-full max-w-xs rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          {EMPLOYEE_ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="input rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Active + archived</option>
          <option value="true">Active only</option>
          <option value="false">Archived only</option>
        </select>
      </div>

      {/* List card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Manager</th>
              <th className="px-4 py-3">Status</th>
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
                  No employees found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/employees/${row.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {row.name}
                  </Link>
                  <div className="text-xs text-slate-500">{row.email}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{row.employee_code ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[row.role] ?? "bg-slate-100 text-slate-700"}`}>
                    {roleLabel(row.role)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {row.department ?? "—"}
                  {row.job_title ? (
                    <div className="text-xs text-slate-500">{row.job_title}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.manager_name ?? "—"}</td>
                <td className="px-4 py-3">
                  {row.active ? (
                    <span className="text-emerald-700">Active</span>
                  ) : (
                    <span className="text-slate-400">Archived</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateEmployee({
  onCreated,
  onCancel,
}: {
  onCreated: (message: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("worker");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers] = useState<EmployeeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/employees?active=true", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { employees?: EmployeeRow[] };
        setManagers(data.employees ?? []);
      } catch {
        // manager list is optional
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          department,
          jobTitle,
          notes,
          managerId: managerId || null,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setError(data.message ?? "Failed to create employee");
        return;
      }
      onCreated(`${data.message ?? "Employee created"}`);
    } catch {
      setError("Failed to create employee");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 rounded-xl border border-slate-200 bg-white p-4"
    >
      <h2 className="mb-3 font-semibold text-slate-900">New employee</h2>
      {error && (
        <p className="mb-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Name *">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Email *">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            {EMPLOYEE_ROLES.map((r) => (
              <option key={r} value={r}>{roleLabel(r)}</option>
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
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className={inputCls}>
            <option value="">—</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg btn-primary px-4 py-2 text-sm font-medium"
        >
          {saving ? "Saving…" : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary rounded-lg px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "input w-full rounded-lg px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
