"use client";

import { useEffect, useState } from "react";
import { AttendancePanel } from "@/components/dashboard/attendance-panel";
import { AttendanceHistory } from "@/components/dashboard/attendance-history";
import { AttendanceMonthlySummary } from "@/components/dashboard/attendance-monthly-summary";
import { AttendanceActivityTracker } from "@/components/dashboard/attendance-activity-tracker";

export function AttendancePageClient({
  showTeamHistory,
  readOnly = false,
  adminExempt = false,
}: {
  showTeamHistory: boolean;
  readOnly?: boolean;
  adminExempt?: boolean;
}) {
  const [trackingOn, setTrackingOn] = useState(false);
  const [openSession, setOpenSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/attendance/today", { credentials: "include" });
        const json = (await res.json().catch(() => null)) as {
          success?: boolean;
          settings?: { activityTrackingEnabled?: boolean };
          record?: { status?: string } | null;
        } | null;
        if (cancelled || !json?.success) return;
        setTrackingOn(Boolean(json.settings?.activityTrackingEnabled));
        setOpenSession(json.record?.status === "open");
      } catch {
        /* ignore */
      }
    }
    void poll();
    const id = window.setInterval(() => void poll(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <>
      <AttendanceActivityTracker
        enabled={!readOnly && trackingOn}
        hasOpenSession={openSession}
      />
      <AttendancePanel readOnly={readOnly} adminExempt={adminExempt} />
      {showTeamHistory ? <AttendanceMonthlySummary /> : null}
      <AttendanceHistory team={showTeamHistory} />
    </>
  );
}
