"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { Spinner } from "@/components/Spinner";

export function GoogleSignInButton({
  label = "Sign in with Google",
}: {
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      // Full-page OAuth redirect works more reliably inside an installed PWA
      // than a popup / partial navigation.
      await signIn("google", { callbackUrl: "/check-in", redirect: true });
    } catch {
      // Navigation away is expected; keep UI responsive if it fails locally.
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {busy ? (
        <Spinner size={16} className="text-slate-500" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
          />
        </svg>
      )}
      {busy ? "Opening Google…" : label}
    </button>
  );
}

export function UserBadge() {
  const { data, status } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-slate-500">
        <Spinner size={14} className="text-teal-700" />
        Checking session…
      </span>
    );
  }
  if (!data?.user?.email) return null;

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut({ callbackUrl: "/" });
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {data.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.user.image}
            alt=""
            width={28}
            height={28}
            className="rounded-full"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-teal-700">
            <Image
              src="/icons/logo.png"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
            />
          </span>
        )}
        <span className="max-w-[180px] truncate text-sm text-slate-700">
          {data.user.name || data.user.email}
        </span>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-busy={signingOut}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-2.5 py-1 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {signingOut ? (
          <>
            <Spinner size={12} className="text-slate-500" />
            Signing out…
          </>
        ) : (
          "Sign out"
        )}
      </button>
    </div>
  );
}
