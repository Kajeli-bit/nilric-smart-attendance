import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Nilric Smart Attendance
        </h1>
        <p className="mt-2 text-slate-600">
          Check in from your phone using office Wi-Fi or GPS.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/check-in"
          className="rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800"
        >
          Open Check-In
        </Link>
        <Link
          href="/admin/login"
          className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:bg-slate-50"
        >
          Admin
        </Link>
      </div>
    </main>
  );
}
