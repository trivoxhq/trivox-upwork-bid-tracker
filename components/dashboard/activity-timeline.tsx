"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  DASH_SECTION_GAP,
  DASH_SECTION_TITLE,
  DASH_SURFACE_CARD,
} from "@/components/dashboard/dashboard-classes";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  ActivityAttendanceMeta,
  ActivityTimelineItem,
} from "@/lib/activity/fetch-timeline";

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

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
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

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-border/70 bg-bg-secondary/70 px-2 py-0.5 text-[11px] font-medium text-text-secondary">
      {children}
    </span>
  );
}

function attendanceChips(
  meta: ActivityAttendanceMeta,
  liveElapsedMinutes: number | null,
): string[] {
  const chips: string[] = [];

  if (meta.event === "check_in" && meta.status === "open") {
    const elapsed = formatDuration(liveElapsedMinutes ?? meta.elapsedMinutes);
    chips.push(elapsed ? `Live · ${elapsed}` : "Live · open");
  }

  if (meta.checkInAt) {
    chips.push(
      meta.checkOutAt
        ? `In ${formatTime(meta.checkInAt)} · Out ${formatTime(meta.checkOutAt)}`
        : `Check-in ${formatTime(meta.checkInAt)}`,
    );
  }

  if ((meta.breakMinutes ?? 0) > 0) {
    const br = formatDuration(meta.breakMinutes);
    if (br) chips.push(`Break ${br}`);
  }

  return chips;
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
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
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
        if (!silent) {
          setError(msg);
          setItems([]);
        }
        return;
      }

      if (!isTimelinePayload(json)) {
        if (!silent) {
          setError("Invalid activity response.");
          setItems([]);
        }
        return;
      }

      setItems(json.items);
      setError(null);
    } catch {
      if (!silent) {
        setError("Network error.");
        setItems([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const poll = window.setInterval(() => {
      void load(true);
    }, 20_000);
    return () => window.clearInterval(poll);
  }, [load]);

  useEffect(() => {
    const hasOpen = items.some(
      (item) =>
        item.attendance?.event === "check_in" && item.attendance.status === "open",
    );
    if (!hasOpen) return;
    const tick = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, [items]);

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
        <EmptyState
          title="No activity yet"
          description="CRM actions, notes, and client history will appear here."
        />
      </div>
    );
  }

  return (
    <section className={`${DASH_SECTION_GAP} mt-8 ${DASH_SURFACE_CARD}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className={DASH_SECTION_TITLE}>Activity feed</h3>
        <p className="text-[11px] text-text-secondary">Updates every 20s</p>
      </div>
      <ul className="mt-4 divide-y divide-border/60">
        {items.map((item) => {
          const liveElapsed =
            item.attendance?.event === "check_in" &&
            item.attendance.status === "open" &&
            item.attendance.checkInAt
              ? Math.max(
                  0,
                  Math.floor(
                    (nowMs - new Date(item.attendance.checkInAt).getTime()) / 60_000,
                  ),
                )
              : null;
          const chips = item.attendance
            ? attendanceChips(item.attendance, liveElapsed)
            : [];

          return (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex flex-wrap items-start gap-3 py-4"
            >
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
                {chips.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <MetaChip key={chip}>{chip}</MetaChip>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
