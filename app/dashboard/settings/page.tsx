import { redirect } from "next/navigation";
import { CatalogSettingsClient } from "@/components/dashboard/catalog-settings-client";
import { AttendanceSettingsPanel } from "@/components/dashboard/attendance-settings-panel";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageSettings } from "@/lib/auth/roles";

export default async function DashboardSettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!canManageSettings(user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardPageHero
        eyebrow="Administration"
        title="Settings"
        description="Manage catalog labels and attendance rules. Attendance rule edits require ATTENDANCE_ADMIN_KEY — admin login alone is not enough."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Settings" },
        ]}
      />

      <CatalogSettingsClient />
      <AttendanceSettingsPanel />
    </div>
  );
}
