import Image from "next/image";
import { GoogleSignInButton } from "@/components/AuthButtons";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";

const HIGHLIGHTS: { icon: string; title: string; body: string }[] = [
  {
    icon: "⏱️",
    title: "Location-verified attendance",
    body: "Check in and out from the office or an active project site.",
  },
  {
    icon: "🌴",
    title: "Time off in one tap",
    body: "Request leave and follow approvals without email threads.",
  },
  {
    icon: "🧩",
    title: "Apps matched to your role",
    body: "Employees, recruitment and reports appear when your role allows.",
  },
  {
    icon: "🔐",
    title: "Google single sign-on",
    body: "No shared passwords — access follows your work Google account.",
  },
];

/**
 * The sign-in gate shown on `/`, `/check-in` and `/time-off` when there is
 * no session. The app requires Google SSO before anything else renders.
 */
export function SignInPanel() {
  return (
    <div className="mx-auto grid w-full max-w-5xl items-center gap-10 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-14">
      <InstallAppPrompt />

      <section className="text-center lg:text-left">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-brand-100 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur">
          <Image
            src="/icons/favicon.png"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
          <span className="text-left leading-tight">
            <span className="block text-sm font-semibold text-slate-900">
              Nilric Suite
            </span>
            <span className="block text-[11px] text-slate-500">
              Smart attendance &amp; HR
            </span>
          </span>
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Your workday,
          <br className="hidden sm:block" />{" "}
          <span className="text-brand-700">in one place.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 lg:mx-0">
          Sign in with your work Google account to open your attendance, time
          off and HR apps. Location access is requested only when you check in
          or out.
        </p>

        <ul className="mt-8 grid gap-3 text-left sm:grid-cols-2">
          {HIGHLIGHTS.map((item) => (
            <li
              key={item.title}
              className="flex gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3.5 backdrop-blur"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {item.icon}
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                  {item.body}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mx-auto w-full max-w-md overflow-hidden rounded-3xl">
        <div className="h-1 w-full bg-gradient-to-r from-brand-300 via-brand-500 to-brand-300" />
        <div className="p-6 text-center sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Sign in to continue
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Use the Google account your workplace registered for you. A personal
            account will not see any apps.
          </p>

          <div className="mt-6">
            <GoogleSignInButton label="Continue with Google" />
          </div>

          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            By continuing you agree that attendance actions record your GPS
            position, verification method and device IP.
          </p>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400">
              Protected by Google sign-in · Nilric never sees your password.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
