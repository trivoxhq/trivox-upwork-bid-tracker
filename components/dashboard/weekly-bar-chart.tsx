"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { barChartThemeAppearance } from "@/lib/chart/bar-appearance";
import { Bar } from "react-chartjs-2";
import {
  DASH_SECTION_GAP,
  DASH_SECTION_TITLE,
  DASH_SURFACE_CHART,
} from "@/components/dashboard/dashboard-classes";
import { ChartPlaceholderSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsDarkTheme } from "@/hooks/use-is-dark-theme";
import { useStatsPoll } from "@/hooks/use-stats-poll";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const COLOR_BIDS = "#378ADD";
const COLOR_WON = "#1D9E75";
const COLOR_RESPONDED = "#BA7517";

type WeeklyRow = {
  date: string;
  bids: number;
  won: number;
  responded: number;
};

function isWeeklyPayload(json: unknown): json is WeeklyRow[] {
  return (
    Array.isArray(json) &&
    json.every(
      (row) =>
        row !== null &&
        typeof row === "object" &&
        typeof (row as WeeklyRow).date === "string" &&
        typeof (row as WeeklyRow).bids === "number" &&
        typeof (row as WeeklyRow).won === "number" &&
        typeof (row as WeeklyRow).responded === "number",
    )
  );
}

function formatDayLabel(ymd: string): string {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return ymd;
  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function WeeklyBarChart() {
  const isDark = useIsDarkTheme();
  const [rows, setRows] = useState<WeeklyRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stats/weekly", { credentials: "include" });
      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          json &&
          typeof json === "object" &&
          json !== null &&
          "message" in json &&
          typeof (json as { message: unknown }).message === "string"
            ? (json as { message: string }).message
            : "Could not load weekly stats.";
        setError(msg);
        setRows(null);
        return;
      }

      if (!isWeeklyPayload(json)) {
        setError("Invalid weekly stats response.");
        setRows(null);
        return;
      }

      setRows(json);
    } catch {
      setError("Network error.");
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useStatsPoll(() => {
    void load();
  });

  const chartData = useMemo(() => {
    if (!rows?.length) return null;
    return {
      labels: rows.map((r) => formatDayLabel(r.date)),
      datasets: [
        {
          label: "Bids",
          data: rows.map((r) => r.bids),
          backgroundColor: COLOR_BIDS,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 28,
        },
        {
          label: "Won",
          data: rows.map((r) => r.won),
          backgroundColor: COLOR_WON,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 28,
        },
        {
          label: "Responded",
          data: rows.map((r) => r.responded),
          backgroundColor: COLOR_RESPONDED,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 28,
        },
      ],
    };
  }, [rows]);

  const options = useMemo<ChartOptions<"bar">>(() => {
    const a = barChartThemeAppearance(isDark);
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      animation: {
        duration: 900,
        easing: "easeOutQuart",
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            padding: 16,
            usePointStyle: true,
            pointStyle: "rectRounded",
            color: a.legendColor,
            font: { size: 12, weight: 500 },
          },
        },
        tooltip: {
          backgroundColor: a.tooltipBg,
          borderColor: a.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          titleMarginBottom: 6,
          titleColor: a.tooltipTitle,
          bodyColor: a.tooltipBody,
        },
      },
      scales: {
        x: {
          stacked: false,
          grid: { display: false },
          ticks: {
            color: a.tickColor,
            font: { size: 11 },
            maxRotation: 45,
            minRotation: 0,
          },
          border: { display: false },
        },
        y: {
          stacked: false,
          beginAtZero: true,
          grid: { color: a.gridColor },
          ticks: {
            color: a.tickColor,
            font: { size: 11 },
            precision: 0,
          },
          border: { display: false },
        },
      },
    };
  }, [isDark]);

  if (loading) {
    return (
      <section className={`${DASH_SECTION_GAP} min-w-0 w-full`} aria-busy="true" aria-label="Loading weekly chart">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={DASH_SECTION_TITLE}>Last 7 days</h2>
        </div>
        <ChartPlaceholderSkeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section className={`${DASH_SECTION_GAP} min-w-0 w-full`}>
        <div className="mb-4">
          <h2 className={DASH_SECTION_TITLE}>Last 7 days</h2>
        </div>
        <div
          className="rounded-xl border border-border/80 bg-bg-primary px-4 py-3 text-sm text-danger shadow-sm"
          role="alert"
        >
          {error ?? "Chart unavailable."}
        </div>
      </section>
    );
  }

  if (!rows?.length) {
    return (
      <section className={`${DASH_SECTION_GAP} min-w-0 w-full`}>
        <div className="mb-4">
          <h2 className={DASH_SECTION_TITLE}>Last 7 days</h2>
        </div>
        <EmptyState title="No data available" />
      </section>
    );
  }

  return (
    <section className={`${DASH_SECTION_GAP} min-w-0 w-full`}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className={DASH_SECTION_TITLE}>Last 7 days</h2>
        <p className="max-w-prose text-xs font-medium leading-relaxed tracking-wide text-text-secondary">
          Bids logged per day (UTC)
        </p>
      </div>
      <div className={DASH_SURFACE_CHART}>
        <div className="relative mx-auto h-[260px] min-w-0 w-full max-w-full sm:h-[300px]">
          {chartData ? <Bar data={chartData} options={options} /> : null}
        </div>
      </div>
    </section>
  );
}
