import { resolvePlatformUser } from "@/lib/platform";
import { can } from "@/lib/roles";
import { TimeOffPageClient } from "@/components/admin/timeoff/TimeOffPageClient";

export const metadata = {
  title: "Time Off — Nilric Suite",
};

export const dynamic = "force-dynamic";

export default async function AdminTimeOffPage() {
  const user = await resolvePlatformUser();
  return (
    <TimeOffPageClient
      canManage={can(user.role, "leaves.manage")}
      viewerEmail={user.email}
    />
  );
}
