import Image from "next/image";

export function BrandHeader({
  title = "Nilric Smart Attendance",
  subtitle = "Sign in with Google, then check in from your phone.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-6 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-teal-700 shadow-sm ring-1 ring-teal-800/20">
        <Image
          src="/icons/logo.png"
          alt="Nilric logo"
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
          priority
        />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-sm text-slate-600 sm:text-base">{subtitle}</p>
      ) : null}
    </header>
  );
}
