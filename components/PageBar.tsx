import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Sticky top bar used by the worker-side app pages (attendance, time off).
 * Keeps back navigation, titles and actions consistent across the PWA.
 */
export function PageBar({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Back to all apps",
  actions,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 rounded-b-2xl bg-brand-700 px-4 py-3 text-white shadow-md">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 text-lg transition-colors hover:bg-white/25"
      >
        ‹
      </Link>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-wide">{title}</p>
        {subtitle ? (
          <p className="truncate text-xs text-white/70">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
