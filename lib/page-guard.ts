import { redirect } from "next/navigation";
import { resolvePlatformUser, type PlatformUser } from "@/lib/platform";
import { can, type Capability } from "@/lib/roles";

/**
 * Server-side page guard for admin modules.
 *
 * Signed-out visitors and roles without the capability are sent back to the
 * app launcher (`/`), which shows the sign-in gate when there is no session.
 */
export async function requirePageCapability(
  capability: Capability,
): Promise<PlatformUser> {
  const user = await resolvePlatformUser();
  if (!user.email || !can(user.role, capability)) {
    redirect("/");
  }
  return user;
}
