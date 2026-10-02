"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIOS) return false;
  // @ts-expect-error iOS Safari exposes navigator.standalone
  return navigator.standalone !== true;
}

export function IosInstallHint() {
  const [showIosHint, setShowIosHint] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setShowIosHint(detectIosSafari());
    }, 0);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowIosHint(false);
  }

  if (showIosHint) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <strong>Install this app:</strong> tap the Share button, then choose{" "}
        <strong>Add to Home Screen</strong>.
      </div>
    );
  }

  if (deferredPrompt) {
    return (
      <button
        type="button"
        onClick={install}
        className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900"
      >
        Install Attendance app to your home screen
      </button>
    );
  }

  return null;
}
