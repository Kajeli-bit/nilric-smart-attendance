import { redirect } from "next/navigation";

/**
 * Legacy OAuth landing path — always send users to the unified home hub.
 * Home shows Check-In for everyone and Admin Panel when email is in ADMIN_EMAILS.
 */
export const dynamic = "force-dynamic";

export default function AuthContinuePage() {
  redirect("/");
}
