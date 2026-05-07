import { BidsTableSkeleton } from "@/components/dashboard/bids-table";
import {
  ChartPlaceholderSkeleton,
  MetricCardSkeleton,
  TargetsBarSkeleton,
} from "@/components/dashboard/dashboard-skeletons";

export default function DashboardLoading() {
  return (
    <main className="mx-auto flex min-h-dvh w-full min-w-0 max-w-6xl flex-col overflow-x-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Dashboard</h1>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>

        <section className="mt-8 w-full">
          <div className="mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Last 7 days
            </h2>
          </div>
          <ChartPlaceholderSkeleton />
        </section>

        <section className="mt-8 w-full space-y-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold tracking-tight text-text-primary sm:text-xl">
              Monthly targets
            </h2>
          </div>
          <TargetsBarSkeleton />
          <TargetsBarSkeleton />
        </section>

        <BidsTableSkeleton />
      </div>
    </main>
  );
}
