import { MonthlyBarChart } from "@/components/dashboard/monthly-bar-chart";
import { NicheProfileAnalytics } from "@/components/dashboard/niche-profile-analytics";
import { TargetsProgress } from "@/components/dashboard/targets-progress";
import { TeamBreakdown } from "@/components/dashboard/team-breakdown";
import { WeeklyBarChart } from "@/components/dashboard/weekly-bar-chart";

const stripOuterSectionMargin = "[&_section]:mt-0";

/**
 * Dedicated insights layout: soft backdrop, asymmetric chart columns, stacked analytics.
 */
export function InsightsHub({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="relative mt-6 min-w-0 sm:mt-8">
      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-bg-primary shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(155deg,rgb(255_255_255)_0%,rgba(232_242_234_0.4)_38%,transparent_72%,rgba(55_154_109_0.06)_100%)] dark:bg-[linear-gradient(155deg,#2a2a2a_0%,rgb(33_33_33_/0.95)_45%,transparent_78%)]"
        />

        <div className="relative px-4 py-4 sm:px-5 sm:py-5">
          <div className="border-l-2 border-brand-primary/40 pl-3 sm:pl-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-primary">
              Analytics hub
            </p>
            <p className="mt-1 max-w-2xl text-[13px] leading-snug text-text-secondary">
              Weekly and monthly rhythms, targets, niche and profile mix — everything in one place.
            </p>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-12 xl:gap-8">
            <div className={`min-w-0 xl:col-span-7 ${stripOuterSectionMargin}`}>
              <WeeklyBarChart />
            </div>
            <div className={`min-w-0 xl:col-span-5 ${stripOuterSectionMargin}`}>
              <MonthlyBarChart months={6} />
            </div>

            <div className={`min-w-0 xl:col-span-12 ${stripOuterSectionMargin}`}>
              <div className="rounded-xl border border-brand-primary/10 bg-linear-to-br from-white/90 to-bg-secondary/35 p-px shadow-sm dark:border-border dark:bg-[linear-gradient(to_bottom_right,rgb(48_48_48_/0.95),rgb(33_33_33_/0.5))]">
                <div className="rounded-[11px] bg-bg-primary/80 px-1 py-1 sm:px-2 sm:py-2">
                  <TargetsProgress />
                </div>
              </div>
            </div>

            <div className={`min-w-0 xl:col-span-12 ${stripOuterSectionMargin}`}>
              <NicheProfileAnalytics />
            </div>

            {isAdmin ? (
              <div className={`min-w-0 xl:col-span-12 ${stripOuterSectionMargin}`}>
                <div className="rounded-xl border border-info/20 bg-linear-to-br from-bg-primary via-white/90 to-[#eef6f9]/80 p-px shadow-sm dark:border-border dark:bg-[linear-gradient(to_bottom_right,#303030,#212121,#1a1a1a)]">
                  <div className="rounded-[11px] bg-bg-primary/75 px-1 py-1 sm:px-2 sm:py-2">
                    <TeamBreakdown />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
