import {
  ATTENDANCE_SETTINGS_ID,
  DEFAULT_BREAK_ALLOWANCE_MINUTES,
  DEFAULT_MIN_FULL_DAY_WORKING_MINUTES,
  DEFAULT_MIN_HALF_DAY_WORKING_MINUTES,
  DEFAULT_SHIFT_TOTAL_MINUTES,
  DEFAULT_WORKING_DAYS_PER_MONTH,
} from "@/lib/attendance/constants";
import type { AttendanceRuleSettings } from "@/lib/attendance/compute";
import { prisma } from "@/lib/prisma";

export async function getOrCreateAttendanceSettings() {
  const existing = await prisma.attendanceSettings.findUnique({
    where: { id: ATTENDANCE_SETTINGS_ID },
  });
  if (existing) return existing;

  return prisma.attendanceSettings.create({
    data: {
      id: ATTENDANCE_SETTINGS_ID,
      shiftTotalMinutes: DEFAULT_SHIFT_TOTAL_MINUTES,
      breakAllowanceMinutes: DEFAULT_BREAK_ALLOWANCE_MINUTES,
      minFullDayWorkingMinutes: DEFAULT_MIN_FULL_DAY_WORKING_MINUTES,
      minHalfDayWorkingMinutes: DEFAULT_MIN_HALF_DAY_WORKING_MINUTES,
      workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH,
      activityTrackingEnabled: false,
    },
  });
}

export function toRuleSettings(row: {
  shiftTotalMinutes: number;
  breakAllowanceMinutes: number;
  minFullDayWorkingMinutes: number;
  minHalfDayWorkingMinutes: number;
  workingDaysPerMonth: number;
}): AttendanceRuleSettings {
  return {
    shiftTotalMinutes: row.shiftTotalMinutes,
    breakAllowanceMinutes: row.breakAllowanceMinutes,
    minFullDayWorkingMinutes: row.minFullDayWorkingMinutes,
    minHalfDayWorkingMinutes: row.minHalfDayWorkingMinutes,
    workingDaysPerMonth: row.workingDaysPerMonth,
  };
}

/** Admin session alone is not enough — ATTENDANCE_ADMIN_KEY must match. */
export function verifyAttendanceAdminKey(key: unknown): boolean {
  const required = process.env.ATTENDANCE_ADMIN_KEY?.trim();
  if (!required) return false;
  return typeof key === "string" && key === required;
}

export function attendanceAdminKeyConfigured(): boolean {
  return Boolean(process.env.ATTENDANCE_ADMIN_KEY?.trim());
}
