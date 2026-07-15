import { computeLiveSnapshot } from "@/lib/attendance/compute";
import type { AttendanceRuleSettings } from "@/lib/attendance/compute";
import { formatDurationMinutes } from "@/lib/attendance/get-work-date";
import { dailySalaryFromMonthly } from "@/lib/attendance/salary";

type BreakRow = { id: string; startedAt: Date; endedAt: Date | null };

type RecordRow = {
  id: string;
  userId: string;
  workDate: Date;
  checkInAt: Date;
  checkOutAt: Date | null;
  breakMinutes: number;
  workingMinutes: number | null;
  salaryAmount: number | null;
  dailySummary: string | null;
  dayType: string | null;
  status: string;
  checkInIp: string;
  checkInUserAgent: string;
  checkInDeviceId: string | null;
  checkOutIp: string | null;
  checkOutUserAgent: string | null;
  checkOutDeviceId: string | null;
  breaks: BreakRow[];
  user?: { id: string; name: string; email: string; monthlySalary: number };
};

export function serializeAttendanceRecord(
  record: RecordRow,
  settings: AttendanceRuleSettings,
  now = new Date(),
) {
  const live =
    record.status === "open"
      ? computeLiveSnapshot(record.checkInAt, record.breakMinutes, record.breaks, settings, now)
      : null;

  const breakMinutes = live?.breakMinutes ?? record.breakMinutes;
  const excessBreakMinutes =
    live?.excessBreakMinutes ??
    Math.max(0, record.breakMinutes - settings.breakAllowanceMinutes);
  const breakAllowanceRemaining =
    live?.breakAllowanceRemaining ??
    Math.max(0, settings.breakAllowanceMinutes - record.breakMinutes);
  const canStartBreak = live?.canStartBreak ?? false;

  const monthlySalary = record.user?.monthlySalary ?? 0;

  return {
    id: record.id,
    userId: record.userId,
    user: record.user
      ? {
          id: record.user.id,
          name: record.user.name,
          email: record.user.email,
          monthlySalary: record.user.monthlySalary,
          estimatedDailyPay: dailySalaryFromMonthly(
            record.user.monthlySalary,
            settings.workingDaysPerMonth,
          ),
        }
      : undefined,
    workDate: record.workDate.toISOString().slice(0, 10),
    checkInAt: record.checkInAt.toISOString(),
    checkOutAt: record.checkOutAt?.toISOString() ?? null,
    breakMinutes,
    excessBreakMinutes,
    breakAllowanceRemaining,
    canStartBreak,
    breakAllowanceMinutes: settings.breakAllowanceMinutes,
    workingMinutes: live?.workingMinutes ?? record.workingMinutes,
    salaryAmount: record.salaryAmount,
    dailySummary: record.dailySummary,
    dayType: record.dayType,
    status: record.status,
    checkInIp: record.checkInIp,
    checkOutIp: record.checkOutIp,
    onBreak: live?.onBreak ?? false,
    leaveButtonMode: live?.leaveButtonMode ?? null,
    remainingToHalfDay: live?.remainingToHalfDay ?? null,
    remainingToFullDay: live?.remainingToFullDay ?? null,
    remainingToShiftEnd: live?.remainingToShiftEnd ?? null,
    elapsedLabel: live ? formatDurationMinutes(live.elapsedMinutes) : null,
    workingLabel: formatDurationMinutes(live?.workingMinutes ?? record.workingMinutes ?? 0),
    breakLabel: formatDurationMinutes(breakMinutes),
    openBreakId: record.breaks.find((b) => !b.endedAt)?.id ?? null,
    monthlySalary,
  };
}
