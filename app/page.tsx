import type { Metadata } from "next";
import { readPageSession } from "@/lib/page-session";
import { resolvePlatformUserForIdentity } from "@/lib/platform";
import { managementAppsForRole, workspaceApps } from "@/lib/apps";
import { AppLauncher } from "@/components/AppLauncher";
import { SignInPanel } from "@/components/SignInPanel";
import { SetupRequiredPanel } from "@/components/SetupRequiredPanel";

export const metadata: Metadata = {
  title: "Your workspace",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await readPageSession();

  if (session.setupIssues.length > 0) {
    return <SetupRequiredPanel issues={session.setupIssues} />;
  }

  if (!session.email) {
    return <SignInPanel />;
  }

  const user = await resolvePlatformUserForIdentity(
    session.email,
    session.name,
    session.image,
  );

  return (
    <AppLauncher
      user={user}
      workspace={workspaceApps()}
      management={managementAppsForRole(user.role)}
    />
  );
}
