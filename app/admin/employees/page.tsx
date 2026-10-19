import { requirePageCapability } from "@/lib/page-guard";
import { can } from "@/lib/roles";
import { EmployeesPageClient } from "@/components/admin/employees/EmployeesPageClient";

export const metadata = {
  title: "Employees — Nilric Suite",
};

export const dynamic = "force-dynamic";

export default async function AdminEmployeesPage() {
  const user = await requirePageCapability("employees.view");
  return <EmployeesPageClient canManage={can(user.role, "employees.manage")} />;
}
