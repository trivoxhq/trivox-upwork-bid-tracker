import Link from "next/link";
import { redirect } from "next/navigation";
import { mapBidsToTableRows } from "@/lib/bids/map-bids-to-table-rows";
import { listBidsForActor } from "@/lib/bids/list-bids-for-actor";
import { BidsTable } from "@/components/dashboard/bids-table";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardBidsPage() {
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
        eyebrow="Bid log"
        title="Bid log"
        description="Filter, edit, or add bids here. Charts and KPIs stay on Overview and Insights."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Bid log" },
        ]}
      />

      <div className="relative mt-8 min-w-0">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-px left-4 right-4 h-px bg-linear-to-r from-transparent via-brand-primary/25 to-transparent sm:left-10 sm:right-10"
        />

        <p className="mt-8 text-[13px] text-text-secondary">
          <Link
            href="/dashboard/insights"
            className="font-semibold text-brand-primary underline decoration-brand-primary/30 underline-offset-2 transition-colors hover:text-text-primary hover:decoration-brand-primary"
          >
            Insights
          </Link>{" "}
          for profiles, niches, and win trends.
        </p>

        <div className="mt-8 rounded-[22px] border border-border/55 bg-linear-to-br from-bg-primary via-white/92 to-[#f3f8f5]/95 p-px shadow-[0_12px_40px_rgb(17_17_17_/0.07)] ring-1 ring-white/85">
          <div className="rounded-[21px] bg-bg-primary/70 px-2 py-3 sm:p-4 md:p-5">
            <BidsTable
              bids={bids}
              isAdmin={isAdmin}
              tableHeading="Bid log"
              sectionGapClassName="mt-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
