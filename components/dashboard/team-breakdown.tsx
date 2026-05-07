"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  DASH_SECTION_GAP,
  DASH_SECTION_SUBTITLE,
  DASH_SECTION_TITLE,
  DASH_SURFACE_CARD_STATIC,
  DASH_TABLE_ROW,
  DASH_TABLE_TH,
} from "@/components/dashboard/dashboard-classes";
import { useStatsPoll } from "@/hooks/use-stats-poll";

export type TeamRow = {
  userId: string;
  name: string;
  totalBids: number;
  wonCount: number;
  winRate: number;
  revenue: number;
};

function winRateClass(rate: number): string {
  if (rate >= 20) return "font-semibold text-emerald-600";
  if (rate >= 10) return "font-semibold text-amber-600";
  return "font-semibold text-red-600";
}

export function TeamBreakdown() {
  const [rows, setRows] = useState<TeamRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stats/team", { credentials: "include" });
      const json: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          json &&
          typeof json === "object" &&
          json !== null &&
          "message" in json &&
          typeof (json as { message: unknown }).message === "string"
            ? (json as { message: string }).message
            : "Could not load team stats.";
        setError(msg);
        setRows(null);
        return;
      }
      if (!Array.isArray(json)) {
        setError("Invalid team stats response.");
        setRows(null);
        return;
      }
      const ok = json.every(
        (r): r is TeamRow =>
          r !== null &&
          typeof r === "object" &&
          typeof (r as TeamRow).userId === "string" &&
          typeof (r as TeamRow).name === "string" &&
          typeof (r as TeamRow).totalBids === "number" &&
          typeof (r as TeamRow).wonCount === "number" &&
          typeof (r as TeamRow).winRate === "number" &&
          typeof (r as TeamRow).revenue === "number",
      );
      if (!ok) {
        setError("Invalid team stats response.");
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

  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  const money = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  let body: ReactNode;
  if (loading) {
    body = (
      <div className="mt-4 space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-bg-secondary" />
        ))}
      </div>
    );
  } else if (error) {
    body = (
      <div className="rounded-xl border border-border/80 bg-bg-primary px-4 py-3 text-sm text-danger shadow-sm" role="alert">
        {error}
      </div>
    );
  } else if (!rows?.length) {
    body = <p className="mt-4 text-sm text-text-secondary">No team members.</p>;
  } else {
    body = (
      <div className={`mt-4 min-w-0 overflow-x-auto rounded-xl border border-border/80 bg-bg-primary shadow-sm`}>
        <table className="min-w-[640px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-secondary/60">
              <th className={DASH_TABLE_TH}>Member</th>
              <th className={`text-right tabular-nums ${DASH_TABLE_TH}`}>Total bids</th>
              <th className={`text-right tabular-nums ${DASH_TABLE_TH}`}>Won</th>
              <th className={`text-right tabular-nums ${DASH_TABLE_TH}`}>Win rate</th>
              <th className={`text-right tabular-nums ${DASH_TABLE_TH}`}>Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/80">
            {rows.map((r) => (
              <tr key={r.userId} className={DASH_TABLE_ROW}>
                <td className="px-4 py-3 font-medium text-text-primary">{r.name}</td>
                <td className="px-4 py-3 text-right tabular-nums text-text-primary">{nf.format(r.totalBids)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-text-primary">{nf.format(r.wonCount)}</td>
                <td className={`px-4 py-3 text-right tabular-nums ${winRateClass(r.winRate)}`}>
                  {r.winRate.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-emerald-600">
                  {money.format(r.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className={`${DASH_SECTION_GAP} min-w-0 w-full`}>
      <div className="mb-1">
        <h2 className={DASH_SECTION_TITLE}>Team breakdown</h2>
        <p className={DASH_SECTION_SUBTITLE}>Per‑member totals, win rate, and revenue won (admin only).</p>
      </div>
      <div className={`${DASH_SURFACE_CARD_STATIC} p-5`}>{body}</div>
    </section>
  );
}
