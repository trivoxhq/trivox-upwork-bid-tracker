import { redirect } from "next/navigation";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardActivityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardPageHero
        eyebrow="CRM"
        title="Activity"
        description="CRM audits, notes, and client history — attendance shows check-in, check-out, break, and live session time."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Activity" },
        ]}
      />

      <ActivityTimeline />
    </div>
  );
}
