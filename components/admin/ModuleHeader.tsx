import type { ReactNode } from "react";

/**
 * Shared header for admin modules: eyebrow section label, title, optional
 * description and trailing toolbar actions.
 */
export function ModuleHeader({
  section,
  title,
  description,
  actions,
}: {
  section: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="eyebrow">{section}</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{title}</h1>
        {description ? (
          <div className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
