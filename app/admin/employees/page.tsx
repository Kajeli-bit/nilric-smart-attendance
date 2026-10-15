import { resolvePlatformUser } from "@/lib/platform";
import { can } from "@/lib/roles";
import { EmployeesPageClient } from "@/components/admin/employees/EmployeesPageClient";

export const metadata = {
  title: "Employees — Nilric Suite",
};

export const dynamic = "force-dynamic";

export default async function AdminEmployeesPage() {
  const user = await resolvePlatformUser();
  return <EmployeesPageClient canManage={can(user.role, "employees.manage")} />;
}
