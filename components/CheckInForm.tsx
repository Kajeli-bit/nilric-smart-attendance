"use client";

import { useEffect, useState } from "react";
import type { GpsCoords } from "@/lib/types";
import { IosInstallHint } from "@/components/IosInstallHint";

type StatusKind = "idle" | "locating" | "success" | "error";

interface StatusState {
  kind: StatusKind;
  message: string;
  method?: string;
  distance?: number | null;
}

function requestGps(): Promise<GpsCoords | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  });
}

function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const id = window.setTimeout(update, 0);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return online;
}

export function CheckInForm() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [name, setName] = useState("");
  const online = useOnline();
  const [status, setStatus] = useState<StatusState>({
    kind: "idle",
    message: "",
  });
  const [busy, setBusy] = useState(false);

  async function submit(action: "check_in" | "check_out") {
    if (busy) return;
    if (!employeeCode.trim()) {
      setStatus({ kind: "error", message: "Enter your employee code" });
      return;
    }
    if (action === "check_in" && !name.trim()) {
      setStatus({ kind: "error", message: "Enter your name to check in" });
      return;
    }
    if (!navigator.onLine) {
      setStatus({
        kind: "error",
        message: "You are offline. Check-in requires an internet connection.",
      });
      return;
    }

    setBusy(true);
    setStatus({
      kind: "locating",
      message:
        action === "check_in"
          ? "Getting your location…"
          : "Getting your location for check-out…",
    });

    const gps = await requestGps();

    setStatus({ kind: "locating", message: "Verifying you are at the office…" });

    try {
      const endpoint = action === "check_in" ? "/api/check-in" : "/api/check-out";
      const payload: Record<string, unknown> = {
        employeeCode: employeeCode.trim(),
      };
      if (action === "check_in") payload.name = name.trim();
      if (gps) payload.gps = gps;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        attendance?: {
          method?: string;
          distanceMeters?: number | null;
        };
      };

      if (!res.ok) {
        setStatus({
          kind: "error",
          message: data.message || data.error || "Request failed",
        });
        return;
      }

      const method = data.attendance?.method ?? "unknown";
      const dist = data.attendance?.distanceMeters ?? null;
      setStatus({
        kind: "success",
        message:
          action === "check_in"
            ? `Checked in successfully via ${method === "office_ip" ? "office Wi-Fi" : "GPS"}!`
            : `Checked out successfully via ${method === "office_ip" ? "office Wi-Fi" : "GPS"}!`,
        method,
        distance: dist,
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <IosInstallHint />

      {!online && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          You are offline. Check-in/out needs an internet connection.
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label
            htmlFor="employeeCode"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Employee code
          </label>
          <input
            id="employeeCode"
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
            placeholder="e.g. NIL-001"
            autoComplete="username"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </div>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={busy || !online}
            onClick={() => submit("check_in")}
            className="rounded-xl bg-teal-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Check In
          </button>
          <button
            type="button"
            disabled={busy || !online}
            onClick={() => submit("check_out")}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Check Out
          </button>
        </div>
      </div>

      {status.message && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            status.kind === "success"
              ? "border-teal-200 bg-teal-50 text-teal-900"
              : status.kind === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
          role="status"
        >
          <p>{status.message}</p>
          {status.kind === "success" &&
            status.distance !== null &&
            status.distance !== undefined && (
              <p className="mt-1 text-xs text-teal-800">
                {Math.round(status.distance)}m from office
              </p>
            )}
        </div>
      )}
    </div>
  );
}
