"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { GpsCoords } from "@/lib/types";
import { UserBadge } from "@/components/AuthButtons";
import { SignInPanel } from "@/components/SignInPanel";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";
import { SitePicker, type WorkerSiteOption } from "@/components/SitePicker";
import { Spinner } from "@/components/Spinner";

type StatusKind = "idle" | "locating" | "requesting_location" | "success" | "error";

interface StatusState {
  kind: StatusKind;
  message: string;
  method?: string;
  distance?: number | null;
  siteName?: string | null;
}

interface TodayState {
  checkedIn: boolean;
  checkedOut: boolean;
  checkInAt: string | null;
  checkOutAt: string | null;
  officeName: string;
  officeCity: string;
  workerName: string;
  siteName?: string | null;
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

function methodLabel(method?: string | null): string {
  if (method === "office_ip") return "office Wi-Fi";
  if (method === "site_gps") return "site GPS";
  return "GPS";
}

export function CheckInForm() {
  const { data: session, status: authStatus } = useSession();
  const [today, setToday] = useState<TodayState | null>(null);
  const [status, setStatus] = useState<StatusState>({ kind: "idle", message: "" });
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<"check_in" | "check_out" | null>(null);
  const [loadingToday, setLoadingToday] = useState(false);
  const [sites, setSites] = useState<WorkerSiteOption[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [siteId, setSiteId] = useState("");

  async function loadSites() {
    setLoadingSites(true);
    try {
      const res = await fetch("/api/sites", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        sites?: { id: string; name: string }[];
      };
      setSites(data.sites ?? []);
    } catch {
      // ignore — HQ path still works
    } finally {
      setLoadingSites(false);
    }
  }

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
        site?: { id: string; name: string } | null;
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
        siteName: data.site?.name ?? null,
      });
      if (data.site?.id) {
        setSiteId((prev) => prev || data.site!.id);
      }
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
      if (!cancelled) {
        void loadToday();
        void loadSites();
      }
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
      setAction(null);
      return;
    }

    const selectedSite = sites.find((s) => s.id === siteId) || null;
    const placeHint = selectedSite?.name || "office";

    setStatus({
      kind: "locating",
      message:
        nextAction === "check_in"
          ? `Location allowed. Checking you in at ${placeHint}…`
          : `Location allowed. Checking you out from ${placeHint}…`,
    });

    try {
      const endpoint = nextAction === "check_in" ? "/api/check-in" : "/api/check-out";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          gps: gpsResult,
          siteId: siteId || null,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        office?: { name: string; city: string };
        worker?: { name: string };
        site?: { id: string; name: string } | null;
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
      const siteName = data.site?.name ?? selectedSite?.name ?? null;
      setStatus({
        kind: "success",
        message:
          data.message ||
          (nextAction === "check_in"
            ? `Checked in via ${methodLabel(method)}.`
            : `Checked out via ${methodLabel(method)}.`),
        method,
        distance: dist,
        siteName,
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
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-center text-slate-600">
        <span className="inline-flex items-center gap-2">
          <Spinner size={16} className="text-brand-600" />
          Loading your attendance status…
        </span>
      </div>
    );
  }

  if (authStatus !== "authenticated") {
    return <SignInPanel />;
  }

  const workerName = today?.workerName || session?.user?.name || session?.user?.email || "there";
  const currentPlace =
    today?.siteName ||
    (today?.officeCity
      ? `${today.officeName}, ${today.officeCity}`
      : today?.officeName) ||
    "the office";

  const statusBusy = status.kind === "locating" || status.kind === "requesting_location";

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <InstallAppPrompt />

      <div className="card mt-4 space-y-4 rounded-3xl p-5">
        <UserBadge />
        <p className="text-sm text-slate-600">
          Signed in as <strong className="text-brand-800">{session?.user?.email}</strong>
        </p>
      </div>

      <div className="card mt-4 space-y-4 rounded-3xl p-5">
        <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-100">
          <p className="font-semibold">Today&apos;s location</p>
          <p className="mt-0.5 text-brand-800">{currentPlace}</p>
          {today && (
            <p className="mt-1 text-xs text-brand-800/90">
              {today.checkedIn && !today.checkedOut
                ? `Checked in at ${formatTime(today.checkInAt)}`
                : today.checkedIn && today.checkedOut
                  ? `In ${formatTime(today.checkInAt)} → Out ${formatTime(today.checkOutAt)}`
                  : "Not checked in yet today"}
            </p>
          )}
          {loadingToday && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-brand-800">
              <Spinner size={12} className="text-brand-600" />
              Refreshing status…
            </p>
          )}
        </div>

        <SitePicker
          sites={sites}
          value={siteId}
          onChange={setSiteId}
          disabled={busy || today?.checkedIn === true}
          loading={loadingSites}
        />

        <p className="text-sm leading-relaxed text-slate-600">
          Hi <strong className="text-slate-800">{workerName}</strong>. Location access
          is required for every check-in and check-out. Pick{" "}
          <strong>Head office</strong> or a project site before checking in.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            disabled={busy || today?.checkedIn === true}
            aria-busy={busy && action === "check_in"}
            onClick={() => submit("check_in")}
            className="btn-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-semibold"
          >
            {busy && action === "check_in" ? (
              <>
                <Spinner size={16} className="text-white" />
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
            className="btn-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-semibold"
          >
            {busy && action === "check_out" ? (
              <>
                <Spinner size={16} className="text-brand-600" />
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
          className={`mt-4 rounded-2xl border p-4 text-sm ${
            status.kind === "success"
              ? "border-brand-200 bg-brand-50 text-brand-900"
              : status.kind === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-brand-100 bg-white text-slate-700"
          }`}
          role="status"
          aria-live="polite"
        >
          <p
            className={`inline-flex items-start gap-2 ${
              status.kind === "success" ? "text-base font-semibold" : ""
            }`}
          >
            {statusBusy && <Spinner size={14} className="mt-0.5 shrink-0 text-brand-600" />}
            <span>{status.message}</span>
          </p>
          {status.kind === "success" &&
            status.distance !== null &&
            status.distance !== undefined && (
              <p className="mt-1 text-xs text-brand-800">
                {Math.round(status.distance)}m from {status.siteName || "office"}
                {status.method ? ` · verified via ${methodLabel(status.method)}` : ""}
              </p>
            )}
        </div>
      )}
    </div>
  );
}
