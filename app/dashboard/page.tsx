import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { DashboardSelfPassword } from "@/components/dashboard/dashboard-self-password";
import {
  OverviewAccountCardMotion,
  OverviewAmbientBackdrop,
  OverviewBodyStagger,
  OverviewChartGridMotion,
  OverviewHeroReveal,
  OverviewStaggerPanel,
} from "@/components/dashboard/dashboard-overview-motion";
import { MetricsCards } from "@/components/dashboard/metrics-cards";
import { MonthlyBarChart } from "@/components/dashboard/monthly-bar-chart";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { WeeklyBarChart } from "@/components/dashboard/weekly-bar-chart";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-w-0 flex-col">
      <OverviewHeroReveal>
        <DashboardPageHero
          eyebrow="Overview"
          title="Dashboard"
          description={
            <>
              Charts below, then KPIs.{" "}
              <Link
                href="/dashboard/bids"
                className="font-semibold text-brand-primary transition-colors hover:text-text-primary"
              >
                Bid log
              </Link>
              {" · "}
              <Link
                href="/dashboard/insights"
                className="font-semibold text-brand-primary transition-colors hover:text-text-primary"
              >
                Insights
              </Link>
            </>
          }
        />
      </OverviewHeroReveal>

      <OverviewBodyStagger>
        <OverviewStaggerPanel className="mt-8 min-w-0">
          <section aria-labelledby="overview-charts-heading">
            <h2 id="overview-charts-heading" className="sr-only">
              Weekly and monthly bid trends
            </h2>
            <OverviewChartGridMotion>
              <WeeklyBarChart />
              <MonthlyBarChart months={6} />
            </OverviewChartGridMotion>
          </section>
        </OverviewStaggerPanel>

        <OverviewStaggerPanel className="relative mt-12 min-w-0">
          <OverviewAmbientBackdrop />

          <div className="border-t border-border/40 pt-10">
            <div className="grid gap-10 lg:grid-cols-[1fr,minmax(0,320px)] lg:gap-12 lg:items-start">
              <div className="min-w-0 space-y-10">
                <section aria-labelledby="metrics-heading-dashboard">
                  <h2 id="metrics-heading-dashboard" className="sr-only">
                    Key metrics
                  </h2>
                  <MetricsCards />
                </section>
              </div>

              <aside className="min-w-0">
                <OverviewAccountCardMotion>
                  <p className="text-[13px] font-semibold uppercase tracking-widest text-text-secondary">
                    Account
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-text-secondary">
                    Keep credentials fresh; team management stays in Team management when you&apos;re admin.
                  </p>
                  <div className="mt-6">
                    <DashboardSelfPassword userId={user.sub} />
                  </div>
                </OverviewAccountCardMotion>
              </aside>
            </div>
          </div>
        </OverviewStaggerPanel>
      </OverviewBodyStagger>
    </div>
  );
}
