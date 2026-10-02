import Link from "next/link";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold text-slate-900">You are offline</h1>
      <p className="max-w-md text-slate-600">
        Check-in requires an internet connection. Please reconnect and try again.
      </p>
      <Link
        href="/check-in"
        className="rounded-xl bg-teal-700 px-5 py-2.5 font-semibold text-white"
      >
        Back to check-in
      </Link>
    </main>
  );
}
