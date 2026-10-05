import { NextResponse } from "next/server";
import { getAuthUrlHost } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Safe Auth.js / Google OAuth diagnostics.
 * Returns presence booleans only — never secret values.
 */
export async function GET(request: Request) {
  const hasAuthSecret = Boolean(process.env.AUTH_SECRET?.trim());
  const hasAuthGoogleId = Boolean(process.env.AUTH_GOOGLE_ID?.trim());
  const hasAuthGoogleSecret = Boolean(process.env.AUTH_GOOGLE_SECRET?.trim());
  const hasGoogleClientId = Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
  const hasGoogleClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());
  const hasAuthUrl = Boolean(process.env.AUTH_URL?.trim());
  const hasAdminEmails = Boolean(process.env.ADMIN_EMAILS?.trim());
  const hasOffice = Boolean(
    process.env.OFFICE_LAT?.trim() && process.env.OFFICE_LNG?.trim(),
  );

  const requestHost = request.headers.get("host")?.toLowerCase() ?? null;
  const authUrlHost = getAuthUrlHost();
  const authUrlMatchesHost =
    !authUrlHost || !requestHost || authUrlHost === requestHost;

  const readyForGoogleSso = Boolean(
    hasAuthSecret &&
      ((hasAuthGoogleId && hasAuthGoogleSecret) ||
        (hasGoogleClientId && hasGoogleClientSecret)),
  );

  return NextResponse.json({
    ok: readyForGoogleSso && authUrlMatchesHost,
    checks: {
      hasAuthSecret,
      hasAuthGoogleId,
      hasAuthGoogleSecret,
      hasGoogleClientId,
      hasGoogleClientSecret,
      hasAuthUrl,
      hasAdminEmails,
      hasOffice,
      authUrlMatchesHost,
    },
    // Host only — not a secret. Empty if AUTH_URL unset.
    authUrlHost,
    requestHost,
    readyForGoogleSso,
    readyForOAuthRedirect: authUrlMatchesHost,
    note: "Values are intentionally not returned. Fix missing keys in Vercel Environment variables, then redeploy. AUTH_URL host must match this site (e.g. nilricsmartattendance.vercel.app).",
  });
}
