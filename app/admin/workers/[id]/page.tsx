"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Worker } from "@/lib/types";

export default function AdminWorkerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [worker, setWorker] = useState<Worker | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const res = await fetch(`/api/admin/workers/${id}`, { credentials: "include" });
      if (!res.ok) {
        setError("Worker not found");
        return;
      }
      const data = (await res.json()) as { worker: Worker };
      setWorker(data.worker);
      setName(data.worker.name);
      setCode(data.worker.employee_code);
    }
    load();
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/admin/workers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, employeeCode: code }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      setError(data.message || "Update failed");
      return;
    }
    setMessage("Saved");
  }

  if (error) return <div className="text-red-600">{error}</div>;
  if (!worker) return <div className="text-slate-500">Loading…</div>;

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Edit worker</h1>
      <form onSubmit={save} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Employee code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </div>
        {message && <p className="text-sm text-teal-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}
