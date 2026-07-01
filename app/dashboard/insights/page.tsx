import { redirect } from "next/navigation";
import { InsightsHub } from "@/components/dashboard/insights-hub";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { getCurrentUser } from "@/lib/auth/session";
import { getCrmPagePermissions } from "@/lib/auth/page-permissions";

export default async function DashboardInsightsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const perms = getCrmPagePermissions(user.role);

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardPageHero
        eyebrow="Insights"
        title="Trends & performance"
        description="Visualize pacing, wins, niche and profile ROI, and how the team stacks up against targets."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Insights" },
        ]}
      />

      <InsightsHub isAdmin={perms.canViewTeamStats} />
    </div>
  );
}
