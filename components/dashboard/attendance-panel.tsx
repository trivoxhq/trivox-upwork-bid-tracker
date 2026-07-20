"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  DASH_BTN_TOOLBAR,
  DASH_SECTION_SUBTITLE,
  DASH_SECTION_TITLE,
  DASH_SURFACE_CARD,
} from "@/components/dashboard/dashboard-classes";
import { getOrCreateDeviceFingerprint } from "@/lib/attendance/device-id";
import { MIN_SUMMARY_LENGTH } from "@/lib/attendance/constants";

type AttendanceRecordView = {
  id: string;
  workDate: string;
  checkInAt: string;
  checkOutAt: string | null;
  breakMinutes: number;
  excessBreakMinutes?: number;
  breakAllowanceRemaining?: number;
  canStartBreak?: boolean;
  breakAllowanceMinutes?: number;
  workingMinutes: number | null;
  salaryAmount: number | null;
  dailySummary: string | null;
  dayType: string | null;
  status: string;
  checkInIp: string;
  checkOutIp: string | null;
  onBreak: boolean;
  leaveButtonMode: "locked" | "half_day" | "check_out" | null;
  remainingToHalfDay: number | null;
  remainingToFullDay: number | null;
  remainingToShiftEnd: number | null;
  elapsedLabel: string | null;
  workingLabel: string;
  breakLabel: string;
};

type TodayPayload = {
  settings: {
    shiftTotalMinutes: number;
    breakAllowanceMinutes: number;
    minFullDayWorkingMinutes: number;
    minHalfDayWorkingMinutes: number;
    workingDaysPerMonth: number;
    activityTrackingEnabled: boolean;
  };
  record: AttendanceRecordView | null;
};

function formatClock(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AttendancePanel({
  readOnly = false,
  adminExempt = false,
}: {
  readOnly?: boolean;
  adminExempt?: boolean;
}) {
  const [data, setData] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance/today", { credentials: "include" });
      const json = (await res.json().catch(() => null)) as
        | { success?: boolean; settings?: TodayPayload["settings"]; record?: AttendanceRecordView | null; message?: string }
        | null;
      if (!res.ok || !json?.success || !json.settings) {
        toast.error(json?.message ?? "Could not load attendance.");
        return;
      }
      setData({ settings: json.settings, record: json.record ?? null });
    } catch {
      toast.error("Network error loading attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  async function postAction(url: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          deviceFingerprint: getOrCreateDeviceFingerprint(),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        record?: AttendanceRecordView;
      } | null;
      if (!res.ok || !json?.success) {
        toast.error(json?.message ?? "Action failed.");
        return false;
      }
      if (json.record && data) {
        setData({ ...data, record: json.record });
      } else {
        await load();
      }
      return true;
    } catch {
      toast.error("Network error.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onCheckIn() {
    const ok = await postAction("/api/attendance/check-in");
    if (ok) toast.success("Checked in.");
  }

  async function onBreakStart() {
    const ok = await postAction("/api/attendance/break/start");
    if (ok) toast.success("Break started.");
  }

  async function onBreakEnd() {
    const ok = await postAction("/api/attendance/break/end");
    if (ok) toast.success("Break ended.");
  }

  async function onLeave() {
    if (summary.trim().length < MIN_SUMMARY_LENGTH) {
      toast.error(`Task summary needs at least ${MIN_SUMMARY_LENGTH} characters.`);
      return;
    }
    const ok = await postAction("/api/attendance/check-out", { dailySummary: summary });
    if (ok) {
      toast.success(
        data?.record?.leaveButtonMode === "half_day"
          ? "Half-day check-out recorded."
          : "Checked out.",
      );
      setCheckoutOpen(false);
      setSummary("");
      await load();
    }
  }

  if (loading) {
    return <p className="text-sm text-text-secondary">Loading attendance…</p>;
  }

  if (!data) {
    return <p className="text-sm text-danger">Could not load attendance.</p>;
  }

  const { record, settings } = data;
  const open = record?.status === "open";
  const leaveLabel =
    record?.leaveButtonMode === "check_out" ? "Check Out" : "Half-Day Check-Out";

  return (
    <div className="space-y-6">
      {settings.activityTrackingEnabled ? (
        <div className="rounded-xl border border-brand-primary/30 bg-brand-primary/10 px-4 py-3 text-sm text-text-primary">
          Activity tracking is <span className="font-semibold">ON</span> — your session activity may be
          sampled while checked in.
        </div>
      ) : null}

      <div className={`${DASH_SURFACE_CARD} p-5 sm:p-6`}>
        <h2 className={DASH_SECTION_TITLE}>Today</h2>
        <p className={`${DASH_SECTION_SUBTITLE} mt-1`}>
          Shift {Math.round(settings.shiftTotalMinutes / 60)}h · break{" "}
          {settings.breakAllowanceMinutes}m · full day{" "}
          {Math.round(settings.minFullDayWorkingMinutes / 60)}h work (Check Out) · earlier leave
          is Half-Day Check-Out · {settings.workingDaysPerMonth} working days/month for salary
        </p>

        {adminExempt ? (
          <div className="mt-6 rounded-xl border border-border/60 bg-bg-secondary/40 px-4 py-3 text-sm text-text-secondary">
            You are an administrator — check-in is not required. Use the history below to review the
            team.
          </div>
        ) : null}

        {!adminExempt && !record ? (
          <div className="mt-6">
            <p className="text-sm text-text-secondary">
              {readOnly ? "No attendance session for you to write." : "You have not checked in yet."}
            </p>
            {!readOnly ? (
              <button
                type="button"
                className={`${DASH_BTN_TOOLBAR} mt-4 border-brand-primary bg-brand-primary text-white hover:bg-brand-hover`}
                disabled={busy}
                onClick={() => void onCheckIn()}
              >
                Check in
              </button>
            ) : null}
          </div>
        ) : !adminExempt && record ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Check in" value={formatClock(record.checkInAt)} />
            <Stat label="Elapsed" value={record.elapsedLabel ?? "—"} />
            <Stat label="Working" value={record.workingLabel} />
            <Stat label="Break used" value={record.breakLabel} />
            <Stat label="IP (in)" value={record.checkInIp} />
            <Stat
              label="Status"
              value={
                record.status === "open"
                  ? record.onBreak
                    ? "On break"
                    : record.leaveButtonMode === "check_out"
                      ? "Ready to Check Out"
                      : "Working · Half-Day Check-Out available"
                  : record.dayType === "half_day"
                    ? "Half-Day Check-Out"
                    : "Check Out"
              }
            />
            {record.checkOutAt ? <Stat label="Check out" value={formatClock(record.checkOutAt)} /> : null}
            {record.salaryAmount != null ? (
              <Stat label="Pay for day" value={`${record.salaryAmount}`} />
            ) : null}
          </div>
        ) : null}

        {record && (record.excessBreakMinutes ?? 0) > 0 ? (
          <div
            className="mt-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-text-primary"
            role="status"
          >
            You took{" "}
            <span className="font-semibold tabular-nums">
              {record.excessBreakMinutes} extra minute
              {(record.excessBreakMinutes ?? 0) === 1 ? "" : "s"}
            </span>{" "}
            beyond the {record.breakAllowanceMinutes ?? settings.breakAllowanceMinutes}-minute
            break allowance. That extra time was deducted from your working hours.
          </div>
        ) : null}

        {open && !readOnly && record && !record.onBreak && record.canStartBreak === false ? (
          <p className="mt-4 text-sm text-text-secondary">
            Break allowance used ({settings.breakAllowanceMinutes}m). Start break is disabled
            for the rest of today.
          </p>
        ) : null}

        {open && !readOnly && record ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {!record.onBreak ? (
              <button
                type="button"
                className={`${DASH_BTN_TOOLBAR} ${
                  record.canStartBreak === false ? "opacity-60" : ""
                }`}
                disabled={busy || record.canStartBreak === false}
                onClick={() => void onBreakStart()}
                title={
                  record.canStartBreak === false
                    ? `Break allowance of ${settings.breakAllowanceMinutes} minutes is fully used.`
                    : `Remaining break allowance: ${record.breakAllowanceRemaining ?? settings.breakAllowanceMinutes}m`
                }
              >
                Start break
              </button>
            ) : (
              <button
                type="button"
                className={DASH_BTN_TOOLBAR}
                disabled={busy}
                onClick={() => void onBreakEnd()}
              >
                End break
              </button>
            )}
            <button
              type="button"
              className={`${DASH_BTN_TOOLBAR} border-brand-primary bg-brand-primary text-white hover:bg-brand-hover`}
              disabled={busy}
              onClick={() => setCheckoutOpen(true)}
              title={
                record.leaveButtonMode === "check_out"
                  ? "Full-day hours met — check out"
                  : record.remainingToFullDay != null && record.remainingToFullDay > 0
                    ? `Half-Day Check-Out · ${record.remainingToFullDay}m more work for full-day Check Out`
                    : "Half-Day Check-Out"
              }
            >
              {leaveLabel}
            </button>
            {record.leaveButtonMode === "half_day" &&
            record.remainingToFullDay != null &&
            record.remainingToFullDay > 0 ? (
              <span className="self-center text-xs text-text-secondary">
                {record.remainingToFullDay}m more working time for full-day Check Out
              </span>
            ) : null}
          </div>
        ) : null}

        {record?.dailySummary ? (
          <div className="mt-6 rounded-xl border border-border/60 bg-bg-secondary/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Daily summary
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-text-primary">{record.dailySummary}</p>
          </div>
        ) : null}
      </div>

      {checkoutOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-bg-primary p-6 shadow-xl">
            <h3 className="text-lg font-bold text-text-primary">{leaveLabel}</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Enter what you completed today. IP/device will be logged.
            </p>
            <textarea
              className="mt-4 min-h-28 w-full rounded-lg border border-input-border bg-bg-primary px-3 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={`Task summary (min ${MIN_SUMMARY_LENGTH} characters)…`}
              disabled={busy}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={DASH_BTN_TOOLBAR}
                disabled={busy}
                onClick={() => setCheckoutOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${DASH_BTN_TOOLBAR} border-brand-primary bg-brand-primary text-white`}
                disabled={busy}
                onClick={() => void onLeave()}
              >
                Confirm {leaveLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-bg-secondary/30 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  );
}
