import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewTeamWide } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

const WON_STATUS = "Won";
const LOST_STATUS = "Lost";

/** Calendar day bounds in UTC (matches other stats routes). */
function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function utcEndOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function utcMonthEnd(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

/** UTC week starting Monday 00:00:00. */
function utcWeekStart(d: Date): Date {
  const day = d.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysSinceMonday, 0, 0, 0, 0),
  );
}

function utcWeekEnd(d: Date): Date {
  const start = utcWeekStart(d);
  return new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999),
  );
}

function dailyStatus(todayWon: number, dailyTarget: number): "good" | "warn" | "bad" {
  if (todayWon >= dailyTarget) return "good";
  if (dailyTarget <= 0) return "good";
  if (todayWon * 100 >= dailyTarget * 70) return "warn";
  return "bad";
}

function sumsByUser(rows: { addedById: string; _sum: { value: number | null } }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.addedById, row._sum.value ?? 0);
  }
  return map;
}

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, isActive: true, role: true },
    });

    if (!actor?.isActive) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const users = canViewTeamWide(actor.role)
        ? await prisma.user.findMany({
            select: { id: true, name: true, dailyTarget: true, weeklyTarget: true, monthlyTarget: true },
            orderBy: { name: "asc" },
          })
        : await prisma.user.findMany({
            where: { id: actor.id },
            select: { id: true, name: true, dailyTarget: true, weeklyTarget: true, monthlyTarget: true },
          });

    if (users.length === 0) {
      return NextResponse.json([]);
    }

    const userIds = users.map((u) => u.id);
    const now = new Date();
    const todayStart = utcMidnight(now);
    const todayEnd = utcEndOfDay(now);
    const weekStart = utcWeekStart(now);
    const weekEnd = utcWeekEnd(now);
    const monthStart = utcMonthStart(now);
    const monthEnd = utcMonthEnd(now);

    const scope = { addedById: { in: userIds } };

    const [todayWonRows, weekWonRows, monthWonRows, monthLostRows] = await Promise.all([
      prisma.bid.groupBy({
        by: ["addedById"],
        where: {
          ...scope,
          status: WON_STATUS,
          date: { gte: todayStart, lte: todayEnd },
        },
        _sum: { value: true },
      }),
      prisma.bid.groupBy({
        by: ["addedById"],
        where: {
          ...scope,
          status: WON_STATUS,
          date: { gte: weekStart, lte: weekEnd },
        },
        _sum: { value: true },
      }),
      prisma.bid.groupBy({
        by: ["addedById"],
        where: {
          ...scope,
          status: WON_STATUS,
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { value: true },
      }),
      prisma.bid.groupBy({
        by: ["addedById"],
        where: {
          ...scope,
          status: LOST_STATUS,
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { value: true },
      }),
    ]);

    const todayWonByUser = sumsByUser(todayWonRows);
    const weekWonByUser = sumsByUser(weekWonRows);
    const monthWonByUser = sumsByUser(monthWonRows);
    const monthLostByUser = sumsByUser(monthLostRows);

    const body = users.map((u) => {
      const todayWon = todayWonByUser.get(u.id) ?? 0;
      const weekWon = weekWonByUser.get(u.id) ?? 0;
      const monthWon = monthWonByUser.get(u.id) ?? 0;
      const monthLost = monthLostByUser.get(u.id) ?? 0;
      const monthRemaining = Math.max(0, u.monthlyTarget - monthWon);
      const weekRemaining = Math.max(0, u.weeklyTarget - weekWon);

      return {
        userId: u.id,
        name: u.name,
        dailyTarget: u.dailyTarget,
        weeklyTarget: u.weeklyTarget,
        monthlyTarget: u.monthlyTarget,
        todayWon,
        weekWon,
        monthWon,
        monthLost,
        monthRemaining,
        weekRemaining,
        dailyStatus: dailyStatus(todayWon, u.dailyTarget),
      };
    });

    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
