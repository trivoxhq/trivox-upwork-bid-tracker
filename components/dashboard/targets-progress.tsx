"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DASH_SECTION_GAP,
  DASH_SECTION_SUBTITLE,
  DASH_SECTION_TITLE,
  DASH_SURFACE_CARD,
} from "@/components/dashboard/dashboard-classes";
import { TargetsBarSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { motionTransition } from "@/components/ui/motion";
import { EmptyState } from "@/components/ui/empty-state";
import { useStatsPoll } from "@/hooks/use-stats-poll";

type TargetRow = {
  userId: string;
  name: string;
  dailyTarget: number;
  monthlyTarget: number;
  todayWon: number;
  monthWon: number;
  monthLost: number;
  monthRemaining: number;
  dailyStatus: "good" | "warn" | "bad";
};

const WON_GREEN = "#1D9E75";
const LOST_RED = "#d93025";
const REMAIN_GREY = "#d4d4d4";

const barTransition = {
  duration: 0.75,
  ease: [0.22, 1, 0.36, 1] as const,
};

function isTargetsPayload(json: unknown): json is TargetRow[] {
  if (!Array.isArray(json)) return false;
  return json.every(
    (row) =>
      row !== null &&
      typeof row === "object" &&
      typeof (row as TargetRow).userId === "string" &&
      typeof (row as TargetRow).name === "string" &&
      typeof (row as TargetRow).dailyTarget === "number" &&
      typeof (row as TargetRow).monthlyTarget === "number" &&
      typeof (row as TargetRow).todayWon === "number" &&
      typeof (row as TargetRow).monthWon === "number" &&
      typeof (row as TargetRow).monthLost === "number" &&
      typeof (row as TargetRow).monthRemaining === "number" &&
      ((row as TargetRow).dailyStatus === "good" ||
        (row as TargetRow).dailyStatus === "warn" ||
        (row as TargetRow).dailyStatus === "bad"),
  );
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function segmentPercents(won: number, lost: number, remaining: number): {
  won: number;
  lost: number;
  remaining: number;
} {
  const total = won + lost + remaining;
  if (total <= 0) {
    return { won: 0, lost: 0, remaining: 100 };
  }
  return {
    won: (won / total) * 100,
    lost: (lost / total) * 100,
    remaining: (remaining / total) * 100,
  };
}

function dailyStatusClass(status: TargetRow["dailyStatus"]): string {
  switch (status) {
    case "good":
      return "text-emerald-600";
    case "warn":
      return "text-amber-600";
    default:
      return "text-red-600";
  }
}

function TargetBar({ won, lost, remaining }: { won: number; lost: number; remaining: number }) {
  const { won: wonPct, lost: lostPct, remaining: remainingPct } = segmentPercents(won, lost, remaining);

  return (
    <div
      className="flex h-7 w-full overflow-hidden rounded-full bg-bg-secondary shadow-inner ring-1 ring-inset ring-border/90 sm:h-8"
      role="img"
      aria-label={`Won ${wonPct.toFixed(0)} percent, lost ${lostPct.toFixed(0)} percent, remaining ${remainingPct.toFixed(0)} percent`}
    >
      <motion.div
        className="h-full min-w-0 overflow-hidden"
        initial={{ flexGrow: 0 }}
        animate={{ flexGrow: wonPct }}
        transition={barTransition}
        style={{ flexBasis: 0, backgroundColor: WON_GREEN }}
      />
      <motion.div
        className="h-full min-w-0 overflow-hidden"
        initial={{ flexGrow: 0 }}
        animate={{ flexGrow: lostPct }}
        transition={{ ...barTransition, delay: 0.06 }}
        style={{ flexBasis: 0, backgroundColor: LOST_RED }}
      />
      <motion.div
        className="h-full min-w-0 overflow-hidden"
        initial={{ flexGrow: 0 }}
        animate={{ flexGrow: remainingPct }}
        transition={{ ...barTransition, delay: 0.12 }}
        style={{ flexBasis: 0, backgroundColor: REMAIN_GREY }}
      />
    </div>
  );
}

function UserTargetCard({ row, index }: { row: TargetRow; index: number }) {
  const dailyClass = dailyStatusClass(row.dailyStatus);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, transition: { duration: 0.2, ease: "easeOut" } }}
      transition={{ ...motionTransition, delay: index * 0.07 }}
      className={`${DASH_SURFACE_CARD} w-full min-w-0 max-w-full sm:p-7`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-text-primary sm:text-xl">{row.name}</h3>
        <p className="text-sm text-text-secondary">
          Monthly target:{" "}
          <span className="font-semibold tabular-nums text-text-primary">
            {formatUsd(row.monthlyTarget)}
          </span>
        </p>
      </div>

      <div className="mt-5 w-full min-w-0">
        <TargetBar won={row.monthWon} lost={row.monthLost} remaining={row.monthRemaining} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: WON_GREEN }} />
          <span className="text-sm text-text-secondary">Won</span>
          <span className="ml-auto text-base font-bold tabular-nums text-text-primary sm:ml-0">
            {formatUsd(row.monthWon)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: LOST_RED }} />
          <span className="text-text-secondary">Lost</span>
          <span className="ml-auto text-base font-bold tabular-nums text-text-primary sm:ml-0">
            {formatUsd(row.monthLost)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: REMAIN_GREY }} />
          <span className="text-text-secondary">Remaining</span>
          <span className="ml-auto text-base font-bold tabular-nums text-text-primary sm:ml-0">
            {formatUsd(row.monthRemaining)}
          </span>
        </div>
      </div>

      <p className={`mt-6 text-lg font-bold tabular-nums sm:text-xl ${dailyClass}`}>
        Today: {formatUsd(row.todayWon)} / {formatUsd(row.dailyTarget)}
      </p>
    </motion.article>
  );
}

export function TargetsProgress() {
  const [rows, setRows] = useState<TargetRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stats/targets", { credentials: "include" });
      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          json &&
          typeof json === "object" &&
          json !== null &&
          "message" in json &&
          typeof (json as { message: unknown }).message === "string"
            ? (json as { message: string }).message
            : "Could not load targets.";
        setError(msg);
        setRows(null);
        return;
      }

      if (!isTargetsPayload(json)) {
        setError("Invalid targets response.");
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

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-4" aria-busy="true">
          {[0, 1].map((i) => (
            <TargetsBarSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (error || !rows) {
      return (
        <div
          className="rounded-xl border border-border/80 bg-bg-primary px-4 py-3 text-sm text-danger shadow-sm"
          role="alert"
        >
          {error ?? "Targets unavailable."}
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <EmptyState title="No targets set yet" />
      );
    }

    const hasAnyTarget = rows.some((row) => row.dailyTarget > 0 || row.monthlyTarget > 0);
    if (!hasAnyTarget) {
      return <EmptyState title="No targets set yet" />;
    }

    return (
      <div className="flex w-full flex-col gap-5">
        {rows.map((row, index) => (
          <UserTargetCard key={row.userId} row={row} index={index} />
        ))}
      </div>
    );
  }, [loading, error, rows]);

  return (
    <section className={`${DASH_SECTION_GAP} min-w-0 w-full`}>
      <div className="mb-4">
        <h2 className={DASH_SECTION_TITLE}>Monthly targets</h2>
        <p className={DASH_SECTION_SUBTITLE}>
          Won, lost, and remaining toward each monthly goal (UTC month).
        </p>
      </div>
      {content}
    </section>
  );
}
