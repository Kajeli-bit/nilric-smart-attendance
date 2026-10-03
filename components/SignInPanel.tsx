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
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Sign in required</h2>
        <p className="mt-1 text-sm text-slate-600">
          Use your Google account to check in or out. This prevents credential
          sharing.
        </p>
        <div className="mt-4">
          <GoogleSignInButton label="Sign in with Google" />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Location access is required for every check-in and check-out.
        </p>
      </div>
    </div>
  );
}
