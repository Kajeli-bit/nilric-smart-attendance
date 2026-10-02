"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Invalid password");
        return;
      }
      router.replace("/admin");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto mt-16 w-full max-w-sm">
      <h1 className="mb-4 text-center text-2xl font-bold text-slate-900">Admin login</h1>
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full rounded-xl bg-teal-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
