import { redirect } from "next/navigation";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { UsersAdminTable } from "@/components/dashboard/users-admin-table";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/auth/roles";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canManageUsers(user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardPageHero
        eyebrow="Administration"
        title="Team management"
        description="Invite @trivoxhq.com teammates, set roles, adjust targets, reset passwords, and activate or deactivate accounts. You cannot deactivate your own account while signed in."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Team management" },
        ]}
      />

      <div className="mt-8">
        <UsersAdminTable currentUserId={user.sub} />
      </div>
    </div>
  );
}
