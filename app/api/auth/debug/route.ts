import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Safe Auth.js / Google OAuth diagnostics.
 * Returns presence booleans only — never secret values.
 */
export async function GET() {
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

  return NextResponse.json({
    ok:
      (hasAuthSecret || hasAuthGoogleId || hasGoogleClientId) &&
      (hasAuthSecret || true),
    checks: {
      hasAuthSecret,
      hasAuthGoogleId,
      hasAuthGoogleSecret,
      hasGoogleClientId,
      hasGoogleClientSecret,
      hasAuthUrl,
      hasAdminEmails,
      hasOffice,
    },
    // Convenience: ready if secret + any google id/secret pair present
    readyForGoogleSso: Boolean(
      hasAuthSecret &&
        ((hasAuthGoogleId && hasAuthGoogleSecret) ||
          (hasGoogleClientId && hasGoogleClientSecret)),
    ),
    note: "Values are intentionally not returned. Fix missing keys in Vercel Environment variables, then redeploy.",
  });
}
