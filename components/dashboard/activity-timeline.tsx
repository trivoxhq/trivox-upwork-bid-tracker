"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DASH_SECTION_GAP,
  DASH_SECTION_TITLE,
  DASH_SURFACE_CARD,
} from "@/components/dashboard/dashboard-classes";
import { EmptyState } from "@/components/ui/empty-state";
import type { ActivityTimelineItem } from "@/lib/activity/fetch-timeline";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function kindLabel(kind: ActivityTimelineItem["kind"]): string {
  switch (kind) {
    case "audit":
      return "Audit";
    case "note":
      return "Note";
    case "client_history":
      return "History";
    default:
      return kind;
  }
}

function kindTone(kind: ActivityTimelineItem["kind"]): string {
  switch (kind) {
    case "audit":
      return "border-info/35 bg-info/10 text-info";
    case "note":
      return "border-brand-primary/30 bg-brand-primary/10 text-brand-primary";
    case "client_history":
      return "border-success/35 bg-success/10 text-success";
    default:
      return "border-border bg-bg-secondary text-text-secondary";
  }
}

function isTimelinePayload(json: unknown): json is { success: true; items: ActivityTimelineItem[] } {
  return (
    json !== null &&
    typeof json === "object" &&
    "success" in json &&
    (json as { success: unknown }).success === true &&
    "items" in json &&
    Array.isArray((json as { items: unknown }).items)
  );
}

export function ActivityTimeline() {
  const [items, setItems] = useState<ActivityTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/activity/timeline", { credentials: "include" });
      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          json &&
          typeof json === "object" &&
          json !== null &&
          "message" in json &&
          typeof (json as { message: unknown }).message === "string"
            ? (json as { message: string }).message
            : "Could not load activity.";
        setError(msg);
        setItems([]);
        return;
      }

      if (!isTimelinePayload(json)) {
        setError("Invalid activity response.");
        setItems([]);
        return;
      }

      setItems(json.items);
    } catch {
      setError("Network error.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className={`${DASH_SECTION_GAP} mt-8 space-y-3`} aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-bg-secondary/80" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`${DASH_SECTION_GAP} mt-8 rounded-xl border border-border/80 bg-bg-primary px-4 py-3 text-sm text-danger shadow-sm`}
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`${DASH_SECTION_GAP} mt-8`}>
        <EmptyState title="No activity yet" description="CRM actions, notes, and client history will appear here." />
      </div>
    );
  }

  return (
    <section className={`${DASH_SECTION_GAP} mt-8 ${DASH_SURFACE_CARD}`}>
      <h3 className={DASH_SECTION_TITLE}>Activity feed</h3>
      <ul className="mt-4 divide-y divide-border/60">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-start gap-3 py-4">
            <span
              className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${kindTone(item.kind)}`}
            >
              {kindLabel(item.kind)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary">{item.summary}</p>
              <p className="mt-1 text-xs text-text-secondary">
                {item.actorName} · {formatDateTime(item.createdAt)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
