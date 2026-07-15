import { NextResponse } from "next/server";
import { canViewTeamAttendance, jsonError, requireAttendanceActor } from "@/lib/attendance/auth";
import {
  currentMonthKey,
  monthBounds,
  type MonthlyDayRow,
  type MonthlyUserSummary,
} from "@/lib/attendance/monthly-summary";
import { canTrackAttendance } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const gate = await requireAttendanceActor();
    if (!gate.ok) return gate.response;

    if (!canViewTeamAttendance(gate.actor.role)) {
      return jsonError(403, "Forbidden.");
    }

    const url = new URL(request.url);
    const month = url.searchParams.get("month")?.trim() || currentMonthKey();
    const bounds = monthBounds(month);
    if (!bounds) {
      return jsonError(400, "month must be YYYY-MM.");
    }

    const fromKey = bounds.from.toISOString().slice(0, 10);
    const toKey = bounds.to.toISOString().slice(0, 10);

    const [users, records] = await Promise.all([
      prisma.user.findMany({
        where: {
          isActive: true,
          // Admins are exempt from check-in; still list others who can track.
          role: { not: "admin" },
        },
        select: {
          id: true,
          name: true,
          email: true,
          monthlySalary: true,
          role: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          workDate: { gte: bounds.from, lte: bounds.to },
        },
        select: {
          id: true,
          userId: true,
          workDate: true,
          checkInAt: true,
          checkOutAt: true,
          workingMinutes: true,
          breakMinutes: true,
          dayType: true,
          status: true,
          salaryAmount: true,
          user: {
            select: { id: true, name: true, email: true, monthlySalary: true, role: true },
          },
        },
        orderBy: [{ workDate: "asc" }, { checkInAt: "asc" }],
      }),
    ]);

    // Include inactive members who still have records this month.
    const byUser = new Map<string, MonthlyUserSummary>();

    for (const u of users) {
      if (!canTrackAttendance(u.role)) continue;
      byUser.set(u.id, {
        userId: u.id,
        name: u.name,
        email: u.email,
        monthlySalary: u.monthlySalary,
        daysAttended: 0,
        fullDays: 0,
        halfDays: 0,
        openDays: 0,
        totalWorkingMinutes: 0,
        totalBreakMinutes: 0,
        totalSalary: 0,
        days: [],
      });
    }

    for (const r of records) {
      if (r.user.role === "admin") continue;
      let row = byUser.get(r.userId);
      if (!row) {
        row = {
          userId: r.userId,
          name: r.user.name,
          email: r.user.email,
          monthlySalary: r.user.monthlySalary,
          daysAttended: 0,
          fullDays: 0,
          halfDays: 0,
          openDays: 0,
          totalWorkingMinutes: 0,
          totalBreakMinutes: 0,
          totalSalary: 0,
          days: [],
        };
        byUser.set(r.userId, row);
      }

      const day: MonthlyDayRow = {
        id: r.id,
        workDate: r.workDate.toISOString().slice(0, 10),
        checkInAt: r.checkInAt.toISOString(),
        checkOutAt: r.checkOutAt?.toISOString() ?? null,
        workingMinutes: r.workingMinutes ?? 0,
        breakMinutes: r.breakMinutes,
        dayType: r.dayType,
        status: r.status,
        salaryAmount: r.salaryAmount,
      };
      row.days.push(day);

      if (r.status === "completed") {
        row.daysAttended += 1;
        row.totalWorkingMinutes += r.workingMinutes ?? 0;
        row.totalBreakMinutes += r.breakMinutes;
        row.totalSalary += r.salaryAmount ?? 0;
        if (r.dayType === "half_day") row.halfDays += 1;
        else row.fullDays += 1;
      } else if (r.status === "open") {
        row.openDays += 1;
      }
    }

    const usersOut = [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      month,
      monthLabel: bounds.label,
      from: fromKey,
      to: toKey,
      users: usersOut,
      totals: {
        members: usersOut.length,
        daysAttended: usersOut.reduce((s, u) => s + u.daysAttended, 0),
        totalSalary: usersOut.reduce((s, u) => s + u.totalSalary, 0),
        totalWorkingMinutes: usersOut.reduce((s, u) => s + u.totalWorkingMinutes, 0),
      },
    });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
