import { redirect } from "next/navigation";
import { listBidsForActor } from "@/lib/bids/list-bids-for-actor";
import type { BidTableRow } from "@/components/dashboard/bids-types";
import { BidsTable } from "@/components/dashboard/bids-table";
import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { TargetsProgress } from "@/components/dashboard/targets-progress";
import { TeamBreakdown } from "@/components/dashboard/team-breakdown";
import { MonthlyBarChart } from "@/components/dashboard/monthly-bar-chart";
import { NicheProfileAnalytics } from "@/components/dashboard/niche-profile-analytics";
import { WeeklyBarChart } from "@/components/dashboard/weekly-bar-chart";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { DashboardSelfPassword } from "@/components/dashboard/dashboard-self-password";
import { getCurrentUser } from "@/lib/auth/session";

function mapBidsToTableRows(
  bids: Awaited<ReturnType<typeof listBidsForActor>>,
): BidTableRow[] {
  return bids.map((b) => ({
    id: b.id,
    date: b.date.toISOString(),
    profileId: b.profileId,
    profileName: b.profile.name,
    nicheId: b.nicheId,
    nicheName: b.niche.name,
    client: b.client,
    bidLink: b.bidLink,
    status: b.status,
    value: b.value,
    notes: b.notes,
    addedById: b.addedById,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    addedBy: { name: b.addedBy.name },
  }));
}

const sectionScroll = "scroll-mt-28";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const bidsRaw = await listBidsForActor({ id: user.sub, role: user.role });
  const bids = mapBidsToTableRows(bidsRaw);
  const isAdmin = user.role === "admin";

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardPageHero
        eyebrow="Overview"
        title="Dashboard"
        description="Performance, charts, and bid log. Use the sidebar to jump to a section or run export and add-bid actions."
      />

      <section id="section-account" className={`${sectionScroll} mt-8`} aria-labelledby="account-heading">
        <h2 id="account-heading" className="sr-only">
          Account security
        </h2>
        <DashboardSelfPassword userId={user.sub} />
      </section>

      <section id="section-metrics" className={sectionScroll} aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="sr-only">
          Metrics
        </h2>
        <MetricsCards />
      </section>

      <section id="section-insights" className={sectionScroll} aria-labelledby="insights-heading">
        <h2 id="insights-heading" className="sr-only">
          Charts and analytics
        </h2>
        <WeeklyBarChart />
        <MonthlyBarChart months={6} />
        <TargetsProgress />
        <NicheProfileAnalytics />
        {isAdmin ? <TeamBreakdown /> : null}
      </section>

      <section id="section-bids" className={sectionScroll} aria-labelledby="bids-heading">
        <h2 id="bids-heading" className="sr-only">
          Bid log
        </h2>
        <BidsTable bids={bids} isAdmin={isAdmin} />
      </section>
    </div>
  );
}
