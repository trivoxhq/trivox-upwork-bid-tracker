import { Skeleton } from "@/components/ui/skeleton";

export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-border/80 bg-bg-primary p-5 shadow-sm">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-20" />
    </div>
  );
}

export function ChartPlaceholderSkeleton() {
  return (
    <div className="rounded-xl border border-border/80 bg-bg-primary p-4 shadow-sm sm:p-6">
      <Skeleton className="h-[280px] w-full sm:h-[300px]" />
    </div>
  );
}

export function TargetsBarSkeleton() {
  return (
    <div className="w-full rounded-xl border border-border/80 bg-bg-primary p-5 shadow-sm sm:p-7">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-2 h-4 w-48" />
      <Skeleton className="mt-5 h-7 w-full rounded-full sm:h-8" />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
      <Skeleton className="mt-6 h-7 w-56" />
    </div>
  );
}

export function BidsTableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border/80 bg-bg-primary shadow-sm">
      <table className="min-w-[920px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-secondary/60">
            {Array.from({ length: 8 }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/80">
          {Array.from({ length: rows }).map((_, row) => (
            <tr key={row}>
              {Array.from({ length: 8 }).map((__, col) => (
                <td key={col} className="px-4 py-3">
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
