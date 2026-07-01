import { redirect } from "next/navigation";
import { CrmReportsDashboard } from "@/components/dashboard/crm-reports-dashboard";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardReportsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardPageHero
        eyebrow="CRM"
        title="Reports"
        description="Leads, conversions, revenue, win rate, and lost overview across your CRM pipeline."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Reports" },
        ]}
      />

      <CrmReportsDashboard />
    </div>
  );
}
