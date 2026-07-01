"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  DASH_SECTION_GAP,
  DASH_SECTION_TITLE,
  DASH_SURFACE_CARD,
  DASH_SURFACE_CHART,
} from "@/components/dashboard/dashboard-classes";
import { ChartPlaceholderSkeleton, MetricCardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsDarkTheme } from "@/hooks/use-is-dark-theme";
import { barChartThemeAppearance } from "@/lib/chart/bar-appearance";
import { DEAL_STAGE_OPTIONS } from "@/lib/deals/catalog";
import { LEAD_STATUS_OPTIONS } from "@/lib/leads/catalog";
import type { CrmReportsPayload } from "@/lib/reports/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const COLOR_PRIMARY = "#108A00";
const COLOR_INFO = "#378ADD";
const COLOR_WON = "#1D9E75";
const COLOR_LOST = "#E5484D";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number): string {
  return `${new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
}

function isReportsPayload(json: unknown): json is { success: true; reports: CrmReportsPayload } {
  return (
    json !== null &&
    typeof json === "object" &&
    "success" in json &&
    (json as { success: unknown }).success === true &&
    "reports" in json &&
    typeof (json as { reports: unknown }).reports === "object" &&
    (json as { reports: unknown }).reports !== null
  );
}

function StageBarChart({
  title,
  labels,
  values,
  color,
}: {
  title: string;
  labels: string[];
  values: number[];
  color: string;
}) {
  const isDark = useIsDarkTheme();

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: title,
          data: values,
          backgroundColor: color,
          borderRadius: 8,
          maxBarThickness: 42,
        },
      ],
    }),
    [color, labels, title, values],
  );

  const options = useMemo<ChartOptions<"bar">>(() => {
    const a = barChartThemeAppearance(isDark);
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: a.tooltipBg,
          borderColor: a.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleColor: a.tooltipTitle,
          bodyColor: a.tooltipBody,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: a.tickColor, font: { size: 11 }, maxRotation: 45, minRotation: 0 },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: { color: a.gridColor },
          ticks: { color: a.tickColor, font: { size: 11 }, precision: 0, stepSize: 1 },
          border: { display: false },
        },
      },
    };
  }, [isDark]);

  const hasData = values.some((value) => value > 0);

  return (
    <section className={DASH_SURFACE_CHART}>
      <h3 className={DASH_SECTION_TITLE}>{title}</h3>
      <div className="mt-4 h-64">
        {hasData ? <Bar data={chartData} options={options} /> : <EmptyState title="No data yet" description="Add records to populate this chart." />}
      </div>
    </section>
  );
}

export function CrmReportsDashboard() {
  const isDark = useIsDarkTheme();
  const [reports, setReports] = useState<CrmReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/crm", { credentials: "include" });
      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          json &&
          typeof json === "object" &&
          json !== null &&
          "message" in json &&
          typeof (json as { message: unknown }).message === "string"
            ? (json as { message: string }).message
            : "Could not load CRM reports.";
        setError(msg);
        setReports(null);
        return;
      }

      if (!isReportsPayload(json)) {
        setError("Invalid reports response.");
        setReports(null);
        return;
      }

      setReports(json.reports);
    } catch {
      setError("Network error.");
      setReports(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const lostChart = useMemo(() => {
    if (!reports) return null;
    const rows = reports.lostOverview.leadsLostBySource;
    const labels = rows.map((row) => row.source);
    const values = rows.map((row) => row.count);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [COLOR_LOST, COLOR_INFO, COLOR_PRIMARY, COLOR_WON, "#BA7517", "#6E56CF"],
          borderWidth: 0,
        },
      ],
    };
  }, [reports]);

  const lostChartOptions = useMemo<ChartOptions<"doughnut">>(() => {
    const a = barChartThemeAppearance(isDark);
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            padding: 12,
            color: a.legendColor,
            font: { size: 11, weight: 500 },
          },
        },
        tooltip: {
          backgroundColor: a.tooltipBg,
          borderColor: a.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleColor: a.tooltipTitle,
          bodyColor: a.tooltipBody,
        },
      },
    };
  }, [isDark]);

  if (loading) {
    return (
      <div className={`${DASH_SECTION_GAP} mt-8 space-y-6`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <ChartPlaceholderSkeleton />
          <ChartPlaceholderSkeleton />
        </div>
      </div>
    );
  }

  if (error || !reports) {
    return (
      <div
        className={`${DASH_SECTION_GAP} mt-8 rounded-xl border border-border/80 bg-bg-primary px-4 py-3 text-sm text-danger shadow-sm`}
        role="alert"
      >
        {error ?? "Reports unavailable."}
      </div>
    );
  }

  const leadStageLabels = [...LEAD_STATUS_OPTIONS];
  const leadStageValues = leadStageLabels.map((stage) => reports.leads.byStage[stage] ?? 0);
  const dealStageLabels = [...DEAL_STAGE_OPTIONS];
  const dealStageValues = dealStageLabels.map((stage) => reports.deals.byStage[stage] ?? 0);

  const kpiCards = [
    { label: "Total leads", value: String(reports.leads.total), tone: "text-text-primary" },
    { label: "Lead conversion", value: formatPct(reports.leads.conversionRate), tone: "text-brand-primary" },
    { label: "Total revenue", value: formatCurrency(reports.revenue.total), tone: "text-success" },
    { label: "Deal win rate", value: formatPct(reports.deals.winRate), tone: "text-info" },
  ];

  return (
    <div className={`${DASH_SECTION_GAP} mt-8 space-y-6`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <article key={card.label} className={DASH_SURFACE_CARD}>
            <p className={DASH_SECTION_TITLE}>{card.label}</p>
            <p className={`mt-3 text-2xl font-bold tracking-tight tabular-nums ${card.tone}`}>{card.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <StageBarChart title="Leads by stage" labels={leadStageLabels} values={leadStageValues} color={COLOR_PRIMARY} />
        <StageBarChart title="Deals by stage" labels={dealStageLabels} values={dealStageValues} color={COLOR_INFO} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className={`${DASH_SURFACE_CARD} xl:col-span-1`}>
          <h3 className={DASH_SECTION_TITLE}>Conversions</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Lead conversion</dt>
              <dd className="font-semibold tabular-nums text-text-primary">{formatPct(reports.winRate.leads)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Deal win rate</dt>
              <dd className="font-semibold tabular-nums text-text-primary">{formatPct(reports.winRate.deals)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Bid win rate</dt>
              <dd className="font-semibold tabular-nums text-text-primary">{formatPct(reports.winRate.bids)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
              <dt className="text-text-secondary">Open leads</dt>
              <dd className="font-semibold tabular-nums text-text-primary">{reports.leads.open}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Open deals</dt>
              <dd className="font-semibold tabular-nums text-text-primary">{reports.deals.open}</dd>
            </div>
          </dl>
        </section>

        <section className={`${DASH_SURFACE_CARD} xl:col-span-1`}>
          <h3 className={DASH_SECTION_TITLE}>Revenue</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Won deals</dt>
              <dd className="font-semibold tabular-nums text-success">{formatCurrency(reports.revenue.dealsWon)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Won bids</dt>
              <dd className="font-semibold tabular-nums text-success">{formatCurrency(reports.revenue.bidsWon)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Total revenue</dt>
              <dd className="font-semibold tabular-nums text-success">{formatCurrency(reports.revenue.total)}</dd>
            </div>
            {reports.revenue.linkedBidsExcluded > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-text-secondary">Linked bids excluded</dt>
                <dd className="font-semibold tabular-nums text-text-secondary">
                  {reports.revenue.linkedBidsExcluded}
                </dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
              <dt className="text-text-secondary">Pipeline value</dt>
              <dd className="font-semibold tabular-nums text-text-primary">{formatCurrency(reports.deals.pipelineValue)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Weighted pipeline</dt>
              <dd className="font-semibold tabular-nums text-text-primary">
                {formatCurrency(reports.deals.weightedPipelineValue)}
              </dd>
            </div>
          </dl>
        </section>

        <section className={`${DASH_SURFACE_CARD} xl:col-span-1`}>
          <h3 className={DASH_SECTION_TITLE}>Lost overview</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Leads lost</dt>
              <dd className="font-semibold tabular-nums text-danger">{reports.lostOverview.leadsLost}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Deals closed lost</dt>
              <dd className="font-semibold tabular-nums text-danger">{reports.lostOverview.dealsClosedLost}</dd>
            </div>
          </dl>
          {reports.lostOverview.lostByReason.length > 0 ? (
            <dl className="mt-4 space-y-2 border-t border-border/60 pt-4 text-sm">
              <dt className={DASH_SECTION_TITLE}>Lost by reason</dt>
              {reports.lostOverview.lostByReason.map((row) => (
                <div key={row.reason} className="flex items-center justify-between gap-3">
                  <dd className="text-text-secondary">{row.reason}</dd>
                  <dt className="font-semibold tabular-nums text-danger">{row.count}</dt>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="mt-4 h-52">
            {reports.lostOverview.leadsLostBySource.length > 0 && lostChart ? (
              <Doughnut data={lostChart} options={lostChartOptions} />
            ) : (
              <EmptyState title="No lost lead data" description="Lost leads by source will appear here." />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
