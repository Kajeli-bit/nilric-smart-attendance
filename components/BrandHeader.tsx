import Image from "next/image";

export function BrandHeader({
  title = "Nilric Smart Attendance",
  subtitle,
  compact = true,
}: {
  title?: string;
  subtitle?: string | null;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <header className="relative mb-2 shrink-0 overflow-hidden text-center">
        <div
          className="brand-glow pointer-events-none absolute inset-x-0 -top-8 -z-10 h-40"
          aria-hidden="true"
        />
        <div className="mx-auto mb-1.5 flex h-12 w-12 items-center justify-center rounded-xl border border-brand-200 bg-white p-1 shadow-[0_10px_24px_-14px_rgba(124,72,207,0.55)]">
          <Image
            src="/icons/favicon.png"
            alt="Nilric logo"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
            priority
          />
        </div>
        <h1 className="text-lg font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? (
          <p className="mx-auto mt-0.5 max-w-xs text-xs text-slate-600">{subtitle}</p>
        ) : null}
      </header>
    );
  }

  return (
    <header className="relative mb-6 overflow-hidden pb-2 pt-2 text-center">
      <div className="brand-glow pointer-events-none absolute inset-x-0 -top-10 -z-10 h-64" aria-hidden="true" />
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-200 bg-white p-2 shadow-[0_14px_32px_-16px_rgba(124,72,207,0.55)]">
        <Image
          src="/icons/favicon.png"
          alt="Nilric logo"
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
          priority
        />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
      {subtitle ? (
        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-600">{subtitle}</p>
      ) : null}
    </header>
  );
}
