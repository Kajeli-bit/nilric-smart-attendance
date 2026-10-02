"use client";

import { useEffect, useState } from "react";
import type { Worker } from "@/lib/types";

export function WorkerTable() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(search: string) {
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const res = await fetch(`/api/admin/workers?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        setError("Not logged in");
        return;
      }
      const data = (await res.json()) as { workers?: Worker[] };
      setWorkers(data.workers ?? []);
      setError(null);
    } catch {
      setError("Failed to load workers");
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/workers`, { credentials: "include" });
      if (cancelled) return;
      if (res.status === 401) {
        setError("Not logged in");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { workers?: Worker[] };
      if (cancelled) return;
      setWorkers(data.workers ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createWorker(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ employeeCode: code, name }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message || "Failed to create worker");
        return;
      }
      setCode("");
      setName("");
      await load(q);
    } finally {
      setSaving(false);
    }
  }

  async function setActive(id: string, active: boolean) {
    const path = active
      ? `/api/admin/workers/${id}/activate`
      : `/api/admin/workers/${id}/deactivate`;
    const res = await fetch(path, { method: "POST", credentials: "include" });
    if (res.ok) await load(q);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={createWorker} className="flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Employee code"
          className="rounded-xl border border-slate-300 px-3 py-2"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="rounded-xl border border-slate-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-teal-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Add worker
        </button>
      </form>

      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(q)}
          placeholder="Search code or name…"
          className="flex-1 rounded-xl border border-slate-300 px-3 py-2"
        />
        <button
          type="button"
          onClick={() => load(q)}
          className="rounded-xl border border-slate-300 px-4 py-2"
        >
          Search
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading workers…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono">{w.employee_code}</td>
                  <td className="px-3 py-2">{w.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        w.active
                          ? "bg-teal-100 text-teal-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {w.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setActive(w.id, !w.active)}
                      className="text-sm text-teal-700 hover:underline"
                    >
                      {w.active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
              {workers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-slate-500">
                    No workers found
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
