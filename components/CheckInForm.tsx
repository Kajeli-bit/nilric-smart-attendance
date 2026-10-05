"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { GpsCoords } from "@/lib/types";
import { UserBadge } from "@/components/AuthButtons";
import { Spinner } from "@/components/Spinner";

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
              "Location permission denied. Allow location to check in or out.",
            code: "PERMISSION_DENIED",
          });
        } else if (err.code === err.TIMEOUT) {
          resolve({
            error: "Location timed out. Please try again.",
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

/**
 * Compact single-screen attendance controls for the PWA hub.
 */
export function CheckInForm() {
  const { data: session, status: authStatus } = useSession();
  const [today, setToday] = useState<TodayState | null>(null);
  const [status, setStatus] = useState<StatusState>({ kind: "idle", message: "" });
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<"check_in" | "check_out" | null>(null);
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

  async function submit(nextAction: "check_in" | "check_out") {
    if (busy) return;
    setBusy(true);
    setAction(nextAction);

    setStatus({
      kind: "requesting_location",
      message: "Allow location to continue…",
    });

    const gpsResult = await requestGps();
    if (!gpsResult || "error" in gpsResult) {
      setStatus({
        kind: "error",
        message: gpsResult?.error || "Location access is required.",
      });
      setBusy(false);
      setAction(null);
      return;
    }

    setStatus({
      kind: "locating",
      message:
        nextAction === "check_in" ? "Checking you in…" : "Checking you out…",
    });

    try {
      const endpoint = nextAction === "check_in" ? "/api/check-in" : "/api/check-out";
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
          (nextAction === "check_in"
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
      setAction(null);
    }
  }

  if (authStatus === "loading") {
    return (
      <div className="card flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm text-slate-600">
        <Spinner size={14} className="text-brand-600" />
        Loading status…
      </div>
    );
  }

  if (authStatus !== "authenticated") {
    return null;
  }

  const workerName =
    today?.workerName || session?.user?.name || session?.user?.email || "there";
  const officeLabel = today?.officeCity
    ? `${today.officeName}, ${today.officeCity}`
    : today?.officeName || "the office";

  const statusBusy =
    status.kind === "locating" || status.kind === "requesting_location";

  const statusLine = (() => {
    if (!today) return "Loading today’s status…";
    if (today.checkedIn && !today.checkedOut) {
      return `In ${formatTime(today.checkInAt)} · ${officeLabel}`;
    }
    if (today.checkedIn && today.checkedOut) {
      return `Done · In ${formatTime(today.checkInAt)} → Out ${formatTime(today.checkOutAt)}`;
    }
    return `Not checked in · ${officeLabel}`;
  })();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="card rounded-2xl p-3">
        <UserBadge />
        <p className="mt-1 truncate text-xs text-slate-500">
          {session?.user?.email}
        </p>
      </div>

      <div className="card flex min-h-0 flex-1 flex-col justify-between rounded-2xl p-3">
        <div className="space-y-2">
          <p className="truncate text-sm font-semibold text-slate-800">
            Hi, {workerName.split(" ")[0]}
          </p>
          <div className="rounded-xl bg-brand-50 px-2.5 py-2 text-xs text-brand-900 ring-1 ring-brand-100">
            <p className="truncate font-medium">{statusLine}</p>
            {loadingToday && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-brand-800">
                <Spinner size={10} className="text-brand-600" />
                Refreshing…
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy || today?.checkedIn === true}
              aria-busy={busy && action === "check_in"}
              onClick={() => submit("check_in")}
              className="btn-primary inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-sm font-semibold"
            >
              {busy && action === "check_in" ? (
                <>
                  <Spinner size={14} className="text-white" />
                  Working…
                </>
              ) : (
                "Check In"
              )}
            </button>
            <button
              type="button"
              disabled={busy || !today?.checkedIn || today?.checkedOut === true}
              aria-busy={busy && action === "check_out"}
              onClick={() => submit("check_out")}
              className="btn-secondary inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-sm font-semibold"
            >
              {busy && action === "check_out" ? (
                <>
                  <Spinner size={14} className="text-brand-600" />
                  Working…
                </>
              ) : (
                "Check Out"
              )}
            </button>
          </div>
        </div>

        {status.message && (
          <div
            className={`mt-2 max-h-16 overflow-hidden rounded-xl border px-2.5 py-2 text-xs ${
              status.kind === "success"
                ? "border-brand-200 bg-brand-50 text-brand-900"
                : status.kind === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-brand-100 bg-white text-slate-700"
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="inline-flex items-start gap-1.5">
              {statusBusy && (
                <Spinner size={12} className="mt-0.5 shrink-0 text-brand-600" />
              )}
              <span className="line-clamp-2">{status.message}</span>
            </p>
            {status.kind === "success" &&
              status.distance !== null &&
              status.distance !== undefined && (
                <p className="mt-0.5 text-[11px] text-brand-800">
                  {Math.round(status.distance)}m from office
                  {status.method
                    ? ` · ${status.method === "office_ip" ? "office Wi-Fi" : "GPS"}`
                    : ""}
                </p>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
