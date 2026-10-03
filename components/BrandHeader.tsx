import Image from "next/image";

export function BrandHeader({
  title = "Nilric Smart Attendance",
  subtitle = "Sign in with Google, then check in from your phone.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <header className="relative mb-6 overflow-hidden pb-2 text-center">
      <div className="brand-glow pointer-events-none absolute inset-x-0 -top-10 -z-10 h-56" aria-hidden="true" />
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[1.4rem] border border-brand-200 bg-white p-2 shadow-[0_16px_40px_-18px_rgba(124,72,207,0.55)]">
        <Image
          src="/icons/logo.png"
          alt="Nilric logo"
          width={72}
          height={72}
          className="h-16 w-16 object-contain"
          priority
        />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600 sm:text-base">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
