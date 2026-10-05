import { BrandHeader } from "@/components/BrandHeader";
import { GoogleSignInButton } from "@/components/AuthButtons";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";

/**
 * Single branded sign-in panel used by the website home page and the
 * installed PWA (via / and /check-in) so copy and branding always match.
 */
export function SignInPanel() {
  return (
    <div className="mx-auto w-full max-w-md">
      <BrandHeader />
      <InstallAppPrompt />
      <div className="card mt-4 overflow-hidden rounded-3xl">
        <div className="h-1 w-full bg-gradient-to-r from-brand-300 via-brand-500 to-brand-300" />
        <div className="p-6 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Sign in required</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Use your Google account to check in or out. This prevents credential
            sharing.
          </p>
          <div className="mt-5">
            <GoogleSignInButton label="Sign in with Google" />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Location access is required for every check-in and check-out.
          </p>
        </div>
      </div>
    </div>
  );
}
