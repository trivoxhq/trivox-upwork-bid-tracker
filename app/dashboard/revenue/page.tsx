import { redirect } from "next/navigation";
import { RevenueDashboard } from "@/components/dashboard/revenue-dashboard";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardRevenuePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardPageHero
        eyebrow="CRM"
        title="Revenue"
        description="Won deals and bids, monthly breakdown, and recent wins."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Revenue" },
        ]}
      />

      <RevenueDashboard />
    </div>
  );
}
