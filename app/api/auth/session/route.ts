import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminEmails, isAdminEmail } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({
        authenticated: false,
        isAdmin: false,
        adminEmailsConfigured: getAdminEmails().length > 0,
      });
    }
    return NextResponse.json({
      authenticated: true,
      isAdmin: isAdminEmail(email),
      // Presence only — never return the allowlist contents.
      adminEmailsConfigured: getAdminEmails().length > 0,
      user: {
        email,
        name: session?.user?.name ?? null,
        image: session?.user?.image ?? null,
      },
    });
  } catch (err) {
    console.error("auth/session error", err);
    return NextResponse.json({
      authenticated: false,
      isAdmin: false,
      adminEmailsConfigured: getAdminEmails().length > 0,
      error: "SESSION_UNAVAILABLE",
    });
  }
}
