"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { GpsCoords } from "@/lib/types";
import { GoogleSignInButton, UserBadge } from "@/components/AuthButtons";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";

type StatusKind = "idle" | "locating" | "requesting_location" | "success" | "error";

interface StatusState {
  kind: StatusKind;
  message: string;
  method?: string;
  distance?: number | null;
}

interface TodayState {
  checkedIn: boolean;
  checkedOut: boolean;
  checkInAt: string | null;
  checkOutAt: string | null;
  officeName: string;
  officeCity: string;
  workerName: string;
}

function requestGps(): Promise<GpsCoords | { error: string; code?: string } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ error: "Location is not supported on this device.", code: "UNSUPPORTED" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            error:
              "Location permission denied. Please allow location access to check in or out.",
            code: "PERMISSION_DENIED",
          });
        } else if (err.code === err.TIMEOUT) {
          resolve({
            error: "Getting your location timed out. Please try again.",
            code: "TIMEOUT",
          });
        } else {
          resolve({
            error: "Could not get your location. Please try again.",
            code: "UNAVAILABLE",
          });
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Dar_es_Salaam",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CheckInForm() {
  const { data: session, status: authStatus } = useSession();
  const [today, setToday] = useState<TodayState | null>(null);
  const [status, setStatus] = useState<StatusState>({ kind: "idle", message: "" });
  const [busy, setBusy] = useState(false);
  const [loadingToday, setLoadingToday] = useState(false);

  async function loadToday() {
    setLoadingToday(true);
    try {
      const res = await fetch("/api/attendance/today", { credentials: "include" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;
        if (data?.message) {
          setStatus({ kind: "error", message: data.message });
        }
        return;
      }
      const data = (await res.json()) as {
        checkedIn: boolean;
        checkedOut: boolean;
        checkInAt: string | null;
        checkOutAt: string | null;
        office: { name: string; city: string };
        worker: { name: string };
        message: string | null;
      };
      setToday({
        checkedIn: data.checkedIn,
        checkedOut: data.checkedOut,
        checkInAt: data.checkInAt,
        checkOutAt: data.checkOutAt,
        officeName: data.office.name,
        officeCity: data.office.city,
        workerName: data.worker.name,
      });
      if (data.message) {
        setStatus({ kind: "success", message: data.message });
      }
    } catch {
      // ignore network blips on initial load
    } finally {
      setLoadingToday(false);
    }
  }

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void loadToday();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authStatus]);

  async function submit(action: "check_in" | "check_out") {
    if (busy) return;
    setBusy(true);

    setStatus({
      kind: "requesting_location",
      message: "Please allow location access to continue…",
    });

    const gpsResult = await requestGps();
    if (!gpsResult || "error" in gpsResult) {
      setStatus({
        kind: "error",
        message:
          gpsResult?.error ||
          "Location access is required to check in or out.",
      });
      setBusy(false);
      return;
    }

    setStatus({
      kind: "locating",
      message:
        action === "check_in"
          ? "Location allowed. Checking you in…"
          : "Location allowed. Checking you out…",
    });

    try {
      const endpoint = action === "check_in" ? "/api/check-in" : "/api/check-out";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ gps: gpsResult }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        office?: { name: string; city: string };
        worker?: { name: string };
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
          data.message ||
          (action === "check_in"
            ? `Checked in via ${method === "office_ip" ? "office Wi-Fi" : "GPS"}.`
            : `Checked out via ${method === "office_ip" ? "office Wi-Fi" : "GPS"}.`),
        method,
        distance: dist,
      });
      await loadToday();
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (authStatus === "loading") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-center text-slate-600">
        Loading…
      </div>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <div className="mx-auto w-full max-w-md space-y-4">
        <InstallAppPrompt />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Sign in required</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use your Google account to check in or out. This prevents credential sharing.
          </p>
          <div className="mt-4">
            <GoogleSignInButton />
          </div>
        </div>
      </div>
    );
  }

  const workerName = today?.workerName || session?.user?.name || session?.user?.email || "there";
  const officeLabel = today?.officeCity
    ? `${today.officeName}, ${today.officeCity}`
    : today?.officeName || "the office";

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <InstallAppPrompt />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <UserBadge />
        <p className="mt-2 text-sm text-slate-600">
          Signed in as <strong>{session?.user?.email}</strong>
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">
          <p className="font-semibold">Office</p>
          <p>{officeLabel}</p>
          {today && (
            <p className="mt-1 text-xs text-teal-800">
              {today.checkedIn && !today.checkedOut
                ? `Checked in at ${formatTime(today.checkInAt)}`
                : today.checkedIn && today.checkedOut
                  ? `In ${formatTime(today.checkInAt)} → Out ${formatTime(today.checkOutAt)}`
                  : "Not checked in yet today"}
            </p>
          )}
          {loadingToday && <p className="mt-1 text-xs">Refreshing status…</p>}
        </div>

        <p className="text-sm text-slate-600">
          Hi <strong>{workerName}</strong>. Location access is required for every
          check-in and check-out.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={busy || today?.checkedIn === true}
            onClick={() => submit("check_in")}
            className="rounded-xl bg-teal-700 px-4 py-3 text-base font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Check In
          </button>
          <button
            type="button"
            disabled={busy || !today?.checkedIn || today?.checkedOut === true}
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
          <p className={status.kind === "success" ? "text-base font-semibold" : ""}>
            {status.message}
          </p>
          {status.kind === "success" &&
            status.distance !== null &&
            status.distance !== undefined && (
              <p className="mt-1 text-xs text-teal-800">
                {Math.round(status.distance)}m from office
                {status.method ? ` · verified via ${status.method === "office_ip" ? "office Wi-Fi" : "GPS"}` : ""}
              </p>
            )}
        </div>
      )}
    </div>
  );
}
