"use client";

import { useEffect, useState } from "react";

interface OverviewData {
  totalWorkers?: number;
  activeWorkers?: number;
  checkedInToday?: number;
  checkedOutToday?: number;
  openToday?: number;
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [workersRes, attendanceRes] = await Promise.all([
          fetch("/api/admin/workers", { credentials: "include" }),
          fetch("/api/admin/attendance", { credentials: "include" }),
        ]);
        if (
          workersRes.status === 401 ||
          workersRes.status === 403 ||
          attendanceRes.status === 401 ||
          attendanceRes.status === 403
        ) {
          setError("Admin Google sign-in required");
          return;
        }
        const workers = (await workersRes.json()) as {
          workers?: { active: boolean }[];
        };
        const attendance = (await attendanceRes.json()) as {
          rows?: {
            attendanceDay: string;
            checkOutAt: string | null;
          }[];
        };

        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Africa/Dar_es_Salaam",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

        const todayRows = (attendance.rows ?? []).filter(
          (r) => r.attendanceDay === today,
        );
        const checkedIn = todayRows.length;
        const checkedOut = todayRows.filter((r) => r.checkOutAt).length;
        const open = todayRows.filter((r) => !r.checkOutAt).length;

        setData({
          totalWorkers: workers.workers?.length ?? 0,
          activeWorkers: workers.workers?.filter((w) => w.active).length ?? 0,
          checkedInToday: checkedIn,
          checkedOutToday: checkedOut,
          openToday: open,
        });
      } catch {
        setError("Failed to load overview");
      }
    }
    load();
  }, []);

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  const cards = [
    { label: "Total workers", value: data?.totalWorkers ?? "…" },
    { label: "Active workers", value: data?.activeWorkers ?? "…" },
    { label: "Checked in today", value: data?.checkedInToday ?? "…" },
    { label: "Checked out today", value: data?.checkedOutToday ?? "…" },
    { label: "Still at office", value: data?.openToday ?? "…" },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Today&apos;s overview</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
