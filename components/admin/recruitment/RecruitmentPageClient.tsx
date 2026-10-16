"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

interface Applicant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  job_position_id: string | null;
  position_name: string | null;
  position_department: string | null;
  rating: number | null;
  notes: string | null;
  hired_at: string | null;
  created_at: string;
}

interface JobPosition {
  id: string;
  name: string;
  department: string | null;
  state: string;
  applicant_count?: number;
}

const STAGES: { key: string; label: string; color: string }[] = [
  { key: "new", label: "New", color: "#ece8f3" },
  { key: "screening", label: "Screening", color: "#dfeee6" },
  { key: "first_interview", label: "1st Interview", color: "#e8e2f5" },
  { key: "second_interview", label: "2nd Interview", color: "#ded4f0" },
  { key: "contract", label: "Contract", color: "#f3ecd9" },
  { key: "employed", label: "Hired", color: "#dff2e3" },
  { key: "refused", label: "Refused", color: "#f8e3e1" },
];

const RATING = ["☆", "★", "★★", "★★★"];

export function RecruitmentPageClient({ canManage }: { canManage: boolean }) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPosition, setShowPosition] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (stageFilter) params.set("stage", stageFilter);
      const res = await fetch(`/api/admin/recruitment?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        setError("You do not have access to Recruitment.");
        setApplicants([]);
        setPositions([]);
        return;
      }
      const data = (await res.json()) as {
        applicants?: Applicant[];
        positions?: JobPosition[];
      };
      setApplicants(data.applicants ?? []);
      setPositions(data.positions ?? []);
      setError(null);
    } catch {
      setError("Failed to load recruitment data");
    } finally {
      setLoading(false);
    }
  }, [q, stageFilter]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  async function changeStage(id: string, stage: string) {
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/recruitment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stage }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Update failed");
        return;
      }
      setNotice(data.message ?? "Stage updated");
      await load();
    } catch {
      setError("Network error");
    }
  }

  async function patchField(id: string, field: "rating" | "notes", value: unknown) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/recruitment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? "Update failed");
        return;
      }
      await load();
    } catch {
      setError("Network error");
    }
  }

  const visibleStages = stageFilter
    ? STAGES.filter((s) => s.key === stageFilter)
    : STAGES;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav className="text-xs text-slate-500">Recruitment</nav>
          <h1 className="text-2xl font-semibold text-slate-900">Recruitment</h1>
          <p className="mt-1 text-sm text-slate-600">
            {positions.length} job positions ·{" "}
            {
              applicants.filter((a) => a.stage !== "employed" && a.stage !== "refused")
                .length
            }{" "}
            applicants in pipeline
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPosition((v) => !v)}
              className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"
              style={{ borderColor: "#714B67", color: "#714B67" }}
            >
              {showPosition ? "Cancel position" : "+ Job Position"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              style={{ backgroundColor: "#714B67" }}
            >
              {showCreate ? "Cancel" : "+ Applicant"}
            </button>
          </div>
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

      {showPosition && canManage && (
        <CreatePosition
          onCreated={(msg) => {
            setShowPosition(false);
            setNotice(msg);
            void load();
          }}
        />
      )}
      {showCreate && canManage && (
        <CreateApplicant
          positions={positions}
          onCreated={(msg) => {
            setShowCreate(false);
            setNotice(msg);
            void load();
          }}
        />
      )}

      {/* Odoo-style toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm">
          {(["kanban", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1.5 capitalize ${
                view === v ? "bg-purple-100 font-medium text-[#5b3a51]" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search applicant or position…"
          className="ml-auto w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading recruitment pipeline…
        </div>
      )}

      {!loading && view === "kanban" && !stageFilter && (
        <KanbanBoard
          applicants={applicants}
          canManage={canManage}
          onStage={changeStage}
          onRating={patchField}
        />
      )}
      {!loading && view === "kanban" && stageFilter && (
        <KanbanBoard
          applicants={applicants}
          canManage={canManage}
          onStage={changeStage}
          onRating={patchField}
          onlyStages={visibleStages}
        />
      )}

      {!loading && view === "list" && <ListTable applicants={applicants} />}
    </div>
  );
}

function KanbanBoard({
  applicants,
  canManage,
  onStage,
  onRating,
  onlyStages,
}: {
  applicants: Applicant[];
  canManage: boolean;
  onStage: (id: string, stage: string) => Promise<void>;
  onRating: (id: string, field: "rating" | "notes", value: unknown) => Promise<void>;
  onlyStages?: { key: string; label: string; color: string }[];
}) {
  const stages = onlyStages ?? STAGES;
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {stages.map((s) => {
        const cards = applicants.filter((a) => a.stage === s.key);
        return (
          <div
            key={s.key}
            className="w-64 shrink-0 rounded-xl"
            style={{ backgroundColor: s.color }}
          >
            <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-800">
              <span>{s.label}</span>
              <span className="rounded bg-white/70 px-1.5 text-xs text-slate-600">
                {cards.length}
              </span>
            </div>
            <div className="space-y-2 px-2 pb-3">
              {cards.length === 0 && (
                <p className="px-1 py-2 text-xs text-slate-500">No applicants</p>
              )}
              {cards.map((a) => (
                <ApplicantCard
                  key={a.id}
                  applicant={a}
                  canManage={canManage}
                  onStage={onStage}
                  onRating={onRating}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApplicantCard({
  applicant: a,
  canManage,
  onStage,
  onRating,
}: {
  applicant: Applicant;
  canManage: boolean;
  onStage: (id: string, stage: string) => Promise<void>;
  onRating: (id: string, field: "rating" | "notes", value: unknown) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const nextStage =
    STAGES[Math.min(STAGES.findIndex((s) => s.key === a.stage) + 1, STAGES.length - 1)];

  return (
    <div className="rounded-lg border border-black/5 bg-white p-3 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        aria-expanded={open}
      >
        <p className="text-sm font-semibold text-slate-900">{a.name}</p>
        <p className="truncate text-xs text-slate-500">
          {a.position_name ?? "No position"}
        </p>
        {a.email && (
          <p className="truncate text-xs text-slate-400">{a.email}</p>
        )}
      </button>

      <div className="mt-1.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => void onRating(a.id, "rating", ((a.rating ?? 0) + 1) % 4)}
          disabled={!canManage}
          className={`text-sm ${canManage ? "cursor-pointer" : "cursor-default"} text-amber-500`}
          title="Click to change rating"
        >
          {RATING[a.rating ?? 0]}
        </button>
        {canManage && a.stage !== "employed" && a.stage !== "refused" && (
          <button
            type="button"
            onClick={() => void onStage(a.id, nextStage.key)}
            className="rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-[#5b3a51] hover:bg-purple-100"
          >
            → {nextStage.label}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
          <p>
            <span className="font-medium">Phone:</span> {a.phone ?? "—"}
          </p>
          <p className="mt-1">
            <span className="font-medium">Notes:</span> {a.notes ?? "—"}
          </p>
          {canManage && (
            <div className="mt-2 flex flex-wrap gap-1">
              {STAGES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => void onStage(a.id, s.key)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${
                    a.stage === s.key
                      ? "border-purple-400 bg-purple-100 font-semibold text-[#5b3a51]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ListTable({ applicants }: { applicants: Applicant[] }) {
  const stageLabel = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5 text-left font-semibold">Applicant</th>
            <th className="px-4 py-2.5 text-left font-semibold">Position</th>
            <th className="px-4 py-2.5 text-left font-semibold">Stage</th>
            <th className="px-4 py-2.5 text-left font-semibold">Rating</th>
            <th className="px-4 py-2.5 text-left font-semibold">Applied</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {applicants.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                No applicants found.
              </td>
            </tr>
          )}
          {applicants.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5">
                <p className="font-medium text-slate-900">{a.name}</p>
                <p className="text-xs text-slate-500">{a.email ?? a.phone ?? "—"}</p>
              </td>
              <td className="px-4 py-2.5 text-slate-700">{a.position_name ?? "—"}</td>
              <td className="px-4 py-2.5">{stageLabel[a.stage] ?? a.stage}</td>
              <td className="px-4 py-2.5 text-amber-500">{RATING[a.rating ?? 0]}</td>
              <td className="px-4 py-2.5 text-slate-500">
                {fmtDate(a.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function CreateApplicant({
  positions,
  onCreated,
}: {
  positions: JobPosition[];
  onCreated: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [positionId, setPositionId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind: "applicant", name, email, phone, positionId, notes }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setErr(data.message ?? "Could not create applicant");
        return;
      }
      onCreated("Applicant added to pipeline");
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-800">New applicant</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Position">
          <select
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">— none —</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
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

function CreatePosition({
  onCreated,
}: {
  onCreated: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind: "position", name, department, description }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setErr(data.message ?? "Could not create position");
        return;
      }
      onCreated("Job position created");
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-800">New job position</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Position name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Department">
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Description">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
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
