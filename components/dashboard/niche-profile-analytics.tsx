"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  DASH_SECTION_GAP,
  DASH_SECTION_SUBTITLE,
  DASH_SECTION_TITLE,
  DASH_SURFACE_CARD_STATIC,
  DASH_TABLE_ROW,
  DASH_TABLE_TH,
  DASH_TRANSITION,
} from "@/components/dashboard/dashboard-classes";
import { useStatsPoll } from "@/hooks/use-stats-poll";

type NicheRow = {
  nicheId: string;
  nicheName: string;
  totalBids: number;
  wonCount: number;
  revenue: number;
  winRate: number;
  responseRate: number;
};

type ProfileRow = {
  profileId: string;
  profileName: string;
  totalBids: number;
  wonCount: number;
  revenue: number;
  winRate: number;
  responseRate: number;
};

function winRateClass(rate: number): string {
  if (rate >= 20) return "font-semibold text-emerald-600";
  if (rate >= 10) return "font-semibold text-amber-600";
  return "font-semibold text-red-600";
}

export function NicheProfileAnalytics() {
  const [niches, setNiches] = useState<NicheRow[] | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nr, pr] = await Promise.all([
        fetch("/api/stats/niche", { credentials: "include" }),
        fetch("/api/stats/profile", { credentials: "include" }),
      ]);
      const jn = await nr.json().catch(() => null);
      const jp = await pr.json().catch(() => null);

      if (!nr.ok) {
        const msg =
          jn &&
          typeof jn === "object" &&
          jn !== null &&
          "message" in jn &&
          typeof (jn as { message: unknown }).message === "string"
            ? (jn as { message: string }).message
            : "Could not load niche stats.";
        setError(msg);
        setNiches(null);
        setProfiles(null);
        return;
      }
      if (!pr.ok) {
        const msg =
          jp &&
          typeof jp === "object" &&
          jp !== null &&
          "message" in jp &&
          typeof (jp as { message: unknown }).message === "string"
            ? (jp as { message: string }).message
            : "Could not load profile stats.";
        setError(msg);
        setNiches(null);
        setProfiles(null);
        return;
      }

      if (!Array.isArray(jn) || !Array.isArray(jp)) {
        setError("Invalid analytics response.");
        setNiches(null);
        setProfiles(null);
        return;
      }

      setNiches(jn as NicheRow[]);
      setProfiles(jp as ProfileRow[]);
    } catch {
      setError("Network error.");
      setNiches(null);
      setProfiles(null);
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
      <div className="mt-4 grid gap-4 lg:grid-cols-2" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className={`h-48 animate-pulse rounded-xl bg-bg-secondary ${DASH_TRANSITION}`} />
        ))}
      </div>
    );
  } else if (error) {
    body = (
      <div className="rounded-xl border border-border/80 bg-bg-primary px-4 py-3 text-sm text-danger shadow-sm" role="alert">
        {error}
      </div>
    );
  } else {
    const nicheTable =
      niches && niches.length > 0 ? (
        <div className="min-w-0 overflow-x-auto rounded-xl border border-border/80 bg-bg-primary shadow-sm">
          <table className="min-w-[420px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary/60">
                <th className={DASH_TABLE_TH}>Niche</th>
                <th className={`text-right tabular-nums ${DASH_TABLE_TH}`}>Bids</th>
                <th className={`text-right tabular-nums ${DASH_TABLE_TH}`}>Won</th>
                <th className={`text-right tabular-nums ${DASH_TABLE_TH}`}>Win %</th>
                <th className={`text-right tabular-nums ${DASH_TABLE_TH}`}>Rev</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {niches.map((r) => (
                <tr key={r.nicheId} className={DASH_TABLE_ROW}>
                  <td
                    className="max-w-[180px] truncate px-4 py-3 font-medium text-text-primary"
                    title={r.nicheName}
                  >
                    {r.nicheName}
                  </td>
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
      ) : (
        <p className="text-sm text-text-secondary">No niche data.</p>
      );

    const profileTable =
      profiles && profiles.length > 0 ? (
        <div className="min-w-0 overflow-x-auto rounded-xl border border-border/80 bg-bg-primary shadow-sm">
          <table className="min-w-[420px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-secondary/60">
                <th className={DASH_TABLE_TH}>Profile</th>
                <th className={`text-right tabular-nums ${DASH_TABLE_TH}`}>Bids</th>
                <th className={`text-right tabular-nums ${DASH_TABLE_TH}`}>Won</th>
                <th className={`text-right tabular-nums ${DASH_TABLE_TH}`}>Win %</th>
                <th className={`text-right tabular-nums ${DASH_TABLE_TH}`}>Rev</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/80">
              {profiles.map((r) => (
                <tr key={r.profileId} className={DASH_TABLE_ROW}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-text-primary">{r.profileName}</td>
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
      ) : (
        <p className="text-sm text-text-secondary">No profile data.</p>
      );

    body = (
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className={`${DASH_SECTION_TITLE} mb-2`}>By niche</h3>
          {nicheTable}
        </div>
        <div>
          <h3 className={`${DASH_SECTION_TITLE} mb-2`}>By profile</h3>
          {profileTable}
        </div>
      </div>
    );
  }

  return (
    <section className={`${DASH_SECTION_GAP} min-w-0 w-full`}>
      <div className="mb-1">
        <h2 className={DASH_SECTION_TITLE}>Niche & profile performance</h2>
        <p className={DASH_SECTION_SUBTITLE}>All‑time aggregates (scoped to your bids unless admin). Polls when enabled.</p>
      </div>
      <div className={`${DASH_SURFACE_CARD_STATIC} p-4 sm:p-5`}>{body}</div>
    </section>
  );
}
