import { requirePageCapability } from "@/lib/page-guard";
import { can } from "@/lib/roles";
import { RecruitmentPageClient } from "@/components/admin/recruitment/RecruitmentPageClient";

export const metadata = {
  title: "Recruitment — Nilric Suite",
};

export const dynamic = "force-dynamic";

export default async function AdminRecruitmentPage() {
  const user = await requirePageCapability("recruitment.view");
  return (
    <RecruitmentPageClient
      canManage={can(user.role, "recruitment.manage")}
    />
  );
}
