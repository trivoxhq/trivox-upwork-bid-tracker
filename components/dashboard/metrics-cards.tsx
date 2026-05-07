"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import {
  DASH_SECTION_GAP,
  DASH_SECTION_TITLE,
  DASH_SURFACE_CARD,
} from "@/components/dashboard/dashboard-classes";
import { MetricCardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { motionTransition } from "@/components/ui/motion";
import { useStatsPoll } from "@/hooks/use-stats-poll";

type MetricsPayload = {
  total: number;
  responseRate: number;
  winRate: number;
  revenue: number;
};

function responseRateClass(rate: number): string {
  if (rate >= 30) return "text-emerald-600";
  if (rate >= 15) return "text-amber-600";
  return "text-red-600";
}

function winRateClass(rate: number): string {
  if (rate >= 20) return "text-emerald-600";
  if (rate >= 10) return "text-amber-600";
  return "text-red-600";
}

export function MetricsCards() {
  const [data, setData] = useState<MetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stats/metrics", { credentials: "include" });
      const json = (await res.json().catch(() => null)) as MetricsPayload | { message?: string } | null;

      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "message" in json && typeof json.message === "string"
            ? json.message
            : "Could not load metrics.";
        setError(msg);
        setData(null);
        return;
      }

      if (
        json &&
        typeof json === "object" &&
        "total" in json &&
        "responseRate" in json &&
        "winRate" in json &&
        "revenue" in json
      ) {
        setData(json as MetricsPayload);
      } else {
        setError("Invalid metrics response.");
        setData(null);
      }
    } catch {
      setError("Network error.");
      setData(null);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.09, delayChildren: 0.04 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: motionTransition,
    },
  };

  if (loading) {
    return (
      <div className={`${DASH_SECTION_GAP} grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className={`${DASH_SECTION_GAP} min-w-0 rounded-xl border border-border/80 bg-bg-primary px-4 py-3 text-sm text-danger shadow-sm`}
        role="alert"
      >
        {error ?? "Metrics unavailable."}
      </div>
    );
  }

  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  const pct = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const cards = [
    {
      key: "total",
      label: "Total Bids",
      value: nf.format(data.total),
      valueClass: "text-text-primary tabular-nums",
    },
    {
      key: "response",
      label: "Response Rate",
      value: `${pct.format(data.responseRate)}%`,
      valueClass: `${responseRateClass(data.responseRate)} font-semibold tabular-nums`,
    },
    {
      key: "win",
      label: "Win Rate",
      value: `${pct.format(data.winRate)}%`,
      valueClass: `${winRateClass(data.winRate)} font-semibold tabular-nums`,
    },
    {
      key: "revenue",
      label: "Revenue",
      value: nf.format(data.revenue),
      valueClass: "font-semibold tabular-nums text-emerald-600",
    },
  ] as const;

  return (
    <motion.div
      className={`${DASH_SECTION_GAP} grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {cards.map((card) => (
        <motion.article
          key={card.key}
          variants={itemVariants}
          whileHover={{ scale: 1.01, transition: { duration: 0.2, ease: "easeOut" } }}
          className={DASH_SURFACE_CARD}
        >
          <p className={DASH_SECTION_TITLE}>{card.label}</p>
          <p className={`mt-3 text-2xl font-bold tracking-tight ${card.valueClass}`}>{card.value}</p>
        </motion.article>
      ))}
    </motion.div>
  );
}
