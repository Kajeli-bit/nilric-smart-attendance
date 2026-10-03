import Image from "next/image";

export function BrandHeader({
  title = "Nilric Smart Attendance",
  subtitle = "Sign in with Google, then check in from your phone.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <header className="relative mb-8 overflow-hidden pb-4 pt-4 text-center">
      <div className="brand-glow pointer-events-none absolute inset-x-0 -top-16 -z-10 h-96" aria-hidden="true" />
      <div className="mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-[1.6rem] border border-brand-200 bg-white p-3 shadow-[0_18px_44px_-18px_rgba(124,72,207,0.55)]">
        <Image
          src="/icons/favicon.png"
          alt="Nilric logo"
          width={96}
          height={96}
          className="h-24 w-24 object-contain"
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
