"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DASH_SECTION_GAP,
  DASH_SECTION_TITLE,
  DASH_SURFACE_CARD,
  DASH_TABLE_ROW,
  DASH_TABLE_TH,
} from "@/components/dashboard/dashboard-classes";
import { MetricCardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import type { RevenueSummaryPayload } from "@/lib/revenue/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isRevenuePayload(json: unknown): json is { success: true; summary: RevenueSummaryPayload } {
  return (
    json !== null &&
    typeof json === "object" &&
    "success" in json &&
    (json as { success: unknown }).success === true &&
    "summary" in json &&
    typeof (json as { summary: unknown }).summary === "object" &&
    (json as { summary: unknown }).summary !== null
  );
}

export function RevenueDashboard() {
  const [summary, setSummary] = useState<RevenueSummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/revenue", { credentials: "include" });
      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          json &&
          typeof json === "object" &&
          json !== null &&
          "message" in json &&
          typeof (json as { message: unknown }).message === "string"
            ? (json as { message: string }).message
            : "Could not load revenue.";
        setError(msg);
        setSummary(null);
        return;
      }

      if (!isRevenuePayload(json)) {
        setError("Invalid revenue response.");
        setSummary(null);
        return;
      }

      setSummary(json.summary);
    } catch {
      setError("Network error.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className={`${DASH_SECTION_GAP} mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div
        className={`${DASH_SECTION_GAP} mt-8 rounded-xl border border-border/80 bg-bg-primary px-4 py-3 text-sm text-danger shadow-sm`}
        role="alert"
      >
        {error ?? "Revenue unavailable."}
      </div>
    );
  }

  const { totals, byMonth, recentWins } = summary;
  const kpiCards = [
    { label: "Won deals", value: formatCurrency(totals.dealsWon), tone: "text-success" },
    { label: "Won bids", value: formatCurrency(totals.bidsWon), tone: "text-success" },
    { label: "Total revenue", value: formatCurrency(totals.total), tone: "text-brand-primary" },
    {
      label: "Linked bids excluded",
      value: String(totals.linkedBidsExcluded),
      tone: "text-text-secondary",
    },
  ];

  return (
    <div className={`${DASH_SECTION_GAP} mt-8 space-y-6`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <article key={card.label} className={DASH_SURFACE_CARD}>
            <p className={DASH_SECTION_TITLE}>{card.label}</p>
            <p className={`mt-3 text-2xl font-bold tracking-tight tabular-nums ${card.tone}`}>
              {card.value}
            </p>
          </article>
        ))}
      </div>

      <section className={DASH_SURFACE_CARD}>
        <h3 className={DASH_SECTION_TITLE}>Monthly breakdown</h3>
        {byMonth.length === 0 ? (
          <EmptyState className="mt-4" title="No revenue yet" description="Won deals and bids will appear here." />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
            <table className="min-w-full divide-y divide-border/70 text-sm">
              <thead className="bg-bg-secondary/75 text-left">
                <tr>
                  <th className={DASH_TABLE_TH}>Period</th>
                  <th className={DASH_TABLE_TH}>Deals won</th>
                  <th className={DASH_TABLE_TH}>Bids won</th>
                  <th className={DASH_TABLE_TH}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {byMonth.map((row) => (
                  <tr key={row.period} className={DASH_TABLE_ROW}>
                    <td className="px-4 py-3 font-medium text-text-primary">{row.period}</td>
                    <td className="px-4 py-3 tabular-nums text-text-secondary">
                      {formatCurrency(row.dealsWon)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-secondary">
                      {formatCurrency(row.bidsWon)}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-success">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={DASH_SURFACE_CARD}>
        <h3 className={DASH_SECTION_TITLE}>Recent wins</h3>
        {recentWins.length === 0 ? (
          <EmptyState className="mt-4" title="No wins yet" description="Recent won deals and bids will appear here." />
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {recentWins.map((win) => (
              <li key={`${win.type}-${win.id}`} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        win.type === "deal"
                          ? "border-info/35 bg-info/10 text-info"
                          : "border-brand-primary/30 bg-brand-primary/10 text-brand-primary"
                      }`}
                    >
                      {win.type}
                    </span>
                    <span className="font-semibold text-text-primary">{win.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {formatDate(win.closedAt)}
                    {win.ownerName ? ` · ${win.ownerName}` : ""}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-success">
                  {formatCurrency(win.value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
