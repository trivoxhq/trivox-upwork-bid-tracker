import type {
  AttendanceDayType,
  LeaveButtonMode,
} from "@/lib/attendance/constants";
import { MIN_SUMMARY_LENGTH } from "@/lib/attendance/constants";
import { minutesBetween } from "@/lib/attendance/get-work-date";
import { calculateAttendanceSalary } from "@/lib/attendance/salary";

export type AttendanceRuleSettings = {
  shiftTotalMinutes: number;
  breakAllowanceMinutes: number;
  minFullDayWorkingMinutes: number;
  minHalfDayWorkingMinutes: number;
  workingDaysPerMonth: number;
};

export type LiveAttendanceSnapshot = {
  elapsedMinutes: number;
  closedBreakMinutes: number;
  openBreakMinutes: number;
  breakMinutes: number;
  /** Minutes of break beyond the allowance (unpaid / deducted from work). */
  excessBreakMinutes: number;
  breakAllowanceRemaining: number;
  /** True when allowance is unused and no break is in progress. */
  canStartBreak: boolean;
  workingMinutes: number;
  leaveButtonMode: LeaveButtonMode;
  remainingToHalfDay: number;
  remainingToFullDay: number;
  remainingToShiftEnd: number;
  onBreak: boolean;
};

type BreakLike = { startedAt: Date; endedAt: Date | null };

/**
 * Actual break time from segments.
 * Closed minutes come from ended breaks; open minutes from any unfinished break.
 * `storedClosedBreakMinutes` is a fallback when segments are missing.
 */
export function totalBreakMinutes(
  storedClosedBreakMinutes: number,
  breaks: BreakLike[],
  now: Date,
): { closed: number; open: number; total: number; onBreak: boolean } {
  let closedFromSegments = 0;
  let open = 0;
  let onBreak = false;
  let hasEndedSegment = false;

  for (const b of breaks) {
    if (!b.endedAt) {
      onBreak = true;
      open += minutesBetween(b.startedAt, now);
    } else {
      hasEndedSegment = true;
      closedFromSegments += minutesBetween(b.startedAt, b.endedAt);
    }
  }

  const closed = hasEndedSegment ? closedFromSegments : storedClosedBreakMinutes;
  return { closed, open, total: closed + open, onBreak };
}

export function computeLiveSnapshot(
  checkInAt: Date,
  closedBreakMinutes: number,
  breaks: BreakLike[],
  settings: AttendanceRuleSettings,
  now = new Date(),
): LiveAttendanceSnapshot {
  const elapsedMinutes = minutesBetween(checkInAt, now);
  const { closed, open, total, onBreak } = totalBreakMinutes(closedBreakMinutes, breaks, now);

  // Full break time (including any overrun past the allowance) is unpaid working time.
  const workingMinutes = Math.max(0, elapsedMinutes - total);
  const excessBreakMinutes = Math.max(0, total - settings.breakAllowanceMinutes);
  const breakAllowanceRemaining = Math.max(0, settings.breakAllowanceMinutes - total);
  const canStartBreak = !onBreak && total < settings.breakAllowanceMinutes;

  const remainingToShiftEnd = Math.max(0, settings.shiftTotalMinutes - elapsedMinutes);
  const remainingToHalfDay = Math.max(0, settings.minHalfDayWorkingMinutes - workingMinutes);
  const remainingToFullDay = Math.max(0, settings.minFullDayWorkingMinutes - workingMinutes);

  let leaveButtonMode: LeaveButtonMode = "locked";
  if (elapsedMinutes >= settings.shiftTotalMinutes) {
    leaveButtonMode =
      workingMinutes >= settings.minFullDayWorkingMinutes ? "check_out" : "locked";
  } else if (workingMinutes >= settings.minHalfDayWorkingMinutes) {
    leaveButtonMode = "half_day";
  }

  return {
    elapsedMinutes,
    closedBreakMinutes: closed,
    openBreakMinutes: open,
    breakMinutes: total,
    excessBreakMinutes,
    breakAllowanceRemaining,
    canStartBreak,
    workingMinutes,
    leaveButtonMode,
    remainingToHalfDay,
    remainingToFullDay,
    remainingToShiftEnd,
    onBreak,
  };
}

export function validateCheckout(params: {
  checkInAt: Date;
  closedBreakMinutes: number;
  breaks: BreakLike[];
  settings: AttendanceRuleSettings;
  summary: string;
  monthlySalary: number;
  now?: Date;
}):
  | {
      ok: true;
      workingMinutes: number;
      breakMinutes: number;
      excessBreakMinutes: number;
      dayType: AttendanceDayType;
      salaryAmount: number;
    }
  | { ok: false; message: string } {
  const now = params.now ?? new Date();
  const summary = params.summary.trim();
  if (summary.length < MIN_SUMMARY_LENGTH) {
    return {
      ok: false,
      message: `Daily task summary must be at least ${MIN_SUMMARY_LENGTH} characters.`,
    };
  }

  const live = computeLiveSnapshot(
    params.checkInAt,
    params.closedBreakMinutes,
    params.breaks,
    params.settings,
    now,
  );

  // Over-allowance break is already deducted from workingMinutes — do not block checkout.

  const salaryAmount = calculateAttendanceSalary({
    monthlySalary: params.monthlySalary,
    workingMinutes: live.workingMinutes,
    workingDaysPerMonth: params.settings.workingDaysPerMonth,
    fullDayWorkingMinutes: params.settings.minFullDayWorkingMinutes,
  });

  const isFullShift = live.elapsedMinutes >= params.settings.shiftTotalMinutes;
  if (isFullShift) {
    if (live.workingMinutes < params.settings.minFullDayWorkingMinutes) {
      return {
        ok: false,
        message: `Need ${params.settings.minFullDayWorkingMinutes - live.workingMinutes} more working minutes for full-day checkout.`,
      };
    }
    return {
      ok: true,
      workingMinutes: live.workingMinutes,
      breakMinutes: live.breakMinutes,
      excessBreakMinutes: live.excessBreakMinutes,
      dayType: "full_day",
      salaryAmount,
    };
  }

  if (live.workingMinutes < params.settings.minHalfDayWorkingMinutes) {
    return {
      ok: false,
      message: `Need ${params.settings.minHalfDayWorkingMinutes - live.workingMinutes} more working minutes for half day.`,
    };
  }

  return {
    ok: true,
    workingMinutes: live.workingMinutes,
    breakMinutes: live.breakMinutes,
    excessBreakMinutes: live.excessBreakMinutes,
    dayType: "half_day",
    salaryAmount,
  };
}
