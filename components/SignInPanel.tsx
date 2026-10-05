import { BrandHeader } from "@/components/BrandHeader";
import { GoogleSignInButton } from "@/components/AuthButtons";

/**
 * Compact sign-in panel for the installed PWA — fits one screen, no scroll.
 */
export function SignInPanel() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
      <BrandHeader
        title="Nilric Smart Attendance"
        subtitle="Sign in with Google to check in."
      />
      <div className="card overflow-hidden rounded-2xl">
        <div className="h-0.5 w-full bg-gradient-to-r from-brand-300 via-brand-500 to-brand-300" />
        <div className="px-4 py-4 text-center">
          <h2 className="text-base font-semibold text-slate-900">Sign in required</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Use your Google account. Location is required for check-in/out.
          </p>
          <div className="mt-3">
            <GoogleSignInButton label="Sign in with Google" />
          </div>
        </div>
      </div>
    </div>
  );
}
