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
    <div className="relative mt-10 min-w-0">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-5 -top-8 bottom-[8%] -z-10 rounded-[26px] bg-[linear-gradient(155deg,rgb(255_255_255)_0%,rgba(232_242_234_0.55)_38%,transparent_72%,rgba(55_154_109_0.07)_100%)] shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.9)] ring-1 ring-border/35 sm:-inset-x-7"
      />

      <div className="relative ml-px border-l-2 border-brand-primary/35 pl-4 sm:pl-5">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-brand-primary">
          Analytics hub
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Weekly and monthly rhythms, targets, niche and profile mix — everything in one place.
        </p>
      </div>

      <div className="relative mt-8 grid gap-8 xl:grid-cols-12">
        <div className={`min-w-0 xl:col-span-7 ${stripOuterSectionMargin}`}>
          <WeeklyBarChart />
        </div>
        <div className={`min-w-0 xl:col-span-5 ${stripOuterSectionMargin}`}>
          <MonthlyBarChart months={6} />
        </div>

        <div className={`min-w-0 xl:col-span-12 ${stripOuterSectionMargin}`}>
          <div className="rounded-2xl border border-brand-primary/10 bg-linear-to-br from-white/90 to-bg-secondary/35 p-px shadow-[0_8px_32px_rgb(17_17_17_/0.06)]">
            <div className="rounded-[15px] bg-bg-primary/80 px-1 py-1 sm:px-2 sm:py-2">
              <TargetsProgress />
            </div>
          </div>
        </div>

        <div className={`min-w-0 xl:col-span-12 ${stripOuterSectionMargin}`}>
          <NicheProfileAnalytics />
        </div>

        {isAdmin ? (
          <div className={`min-w-0 xl:col-span-12 ${stripOuterSectionMargin}`}>
            <div className="rounded-2xl border border-info/20 bg-linear-to-br from-bg-primary via-white/90 to-[#eef6f9]/80 p-px shadow-[0_8px_28px_rgb(55_139_209_/0.08)]">
              <div className="rounded-[15px] bg-bg-primary/75 px-1 py-1 sm:px-2 sm:py-2">
                <TeamBreakdown />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
