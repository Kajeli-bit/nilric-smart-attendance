"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "nilric-pwa-install-dismissed-at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 2 weeks

type Platform = "android" | "ios" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari
  // @ts-expect-error non-standard Safari property
  if (navigator.standalone === true) return true;
  return false;
}

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore storage failures
  }
}

export function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissedAt, setDismissedAt] = useState(0);

  useEffect(() => {
    // Defer initial detection so the effect body has no direct setState.
    const initTimer = window.setTimeout(() => {
      if (isStandalone() || isDismissedRecently()) {
        setInstalled(true);
        return;
      }
      setPlatform(detectPlatform());
    }, 0);

    // Delay so it doesn't compete with first paint / location permission
    const showTimer = window.setTimeout(() => {
      if (!isStandalone() && !isDismissedRecently()) {
        setVisible(true);
      }
    }, 1200);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.clearTimeout(initTimer);
      window.clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setVisible(false);
      }
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  }

  function handleDismiss() {
    dismiss();
    setDismissedAt(Date.now());
    setVisible(false);
  }

  if (installed || !visible || dismissedAt) return null;

  // Prefer native one-tap install when the browser exposes it
  const canNativeInstall = Boolean(deferredPrompt);

  return (
    <div
      className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[360px]"
      role="dialog"
      aria-label="Install Attendance app"
    >
      <div className="card rounded-3xl p-4">
        <div className="flex items-start gap-3">
          <Image
            src="/icons/favicon.png"
            alt=""
            width={48}
            height={48}
            className="rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Install Attendance</p>
            <p className="mt-0.5 text-sm text-slate-600">
              {canNativeInstall
                ? "Add the app to your home screen for faster check-ins."
                : platform === "ios"
                  ? "On iPhone: tap Share, then Add to Home Screen."
                  : platform === "android"
                    ? "Open in Chrome, then choose Install app from the menu."
                    : "Use your browser menu to install this app on your phone."}
            </p>

            {platform === "ios" && (
              <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-xs text-slate-600">
                <li>Tap the Share button (square with arrow)</li>
                <li>Scroll and choose <strong>Add to Home Screen</strong></li>
                <li>Tap Add</li>
              </ol>
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {canNativeInstall ? (
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="btn-primary flex-1 rounded-xl px-3 py-2 text-sm font-semibold"
            >
              {installing ? "Installing…" : "Install app"}
            </button>
          ) : (
            <a
              href="/check-in"
              className="btn-primary flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold"
            >
              Got it
            </a>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
