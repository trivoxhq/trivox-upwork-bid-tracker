import { redirect } from "next/navigation";
import { CatalogSettingsClient } from "@/components/dashboard/catalog-settings-client";
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
        description="Manage profile and niche labels used in the bid log. Deactivated items stay on historical bids but no longer appear when adding new bids."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Settings" },
        ]}
      />

      <CatalogSettingsClient />
    </div>
  );
}
