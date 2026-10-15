import { resolvePlatformUser } from "@/lib/platform";
import { can } from "@/lib/roles";
import { EmployeeDetailClient } from "@/components/admin/employees/EmployeeDetailClient";

export const metadata = {
  title: "Employee — Nilric Suite",
};

export const dynamic = "force-dynamic";

export default async function AdminEmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await resolvePlatformUser();
  return (
    <EmployeeDetailClient employeeId={id} canManage={can(user.role, "employees.manage")} />
  );
}
