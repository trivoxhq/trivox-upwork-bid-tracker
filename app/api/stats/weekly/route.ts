import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewTeamWide } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

const WON_STATUS = "Won";

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function utcEndOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function toYmdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Last 7 calendar days in UTC, oldest → newest (includes today). */
function last7UtcDayKeys(anchor: Date): string[] {
  const todayStart = utcMidnight(anchor);
  const firstDay = new Date(todayStart);
  firstDay.setUTCDate(firstDay.getUTCDate() - 6);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(firstDay);
    d.setUTCDate(firstDay.getUTCDate() + i);
    keys.push(toYmdUtc(d));
  }
  return keys;
}

function isRespondedBucket(status: string): boolean {
  return status === "Responded" || status === "Interview";
}

/** Counts by bid `date` (UTC calendar day): all bids sent that day; won / responded by current status. */
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

    const whereBase = canViewTeamWide(actor.role) ? {} : { addedById: actor.id };

    const now = new Date();
    const todayStart = utcMidnight(now);
    const rangeStart = new Date(todayStart);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - 6);
    const rangeEnd = utcEndOfDay(now);

    const dayKeys = last7UtcDayKeys(now);

    const emptyDay = () => ({ bids: 0, won: 0, responded: 0 });
    const byDay = new Map<string, ReturnType<typeof emptyDay>>();
    for (const key of dayKeys) {
      byDay.set(key, emptyDay());
    }

    /** Bucket by bid `date` (day bid was logged), matching handoff “per day” semantics. */
    const rows = await prisma.bid.findMany({
      where: {
        ...whereBase,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: { date: true, status: true },
    });

    for (const row of rows) {
      const key = toYmdUtc(row.date);
      const bucket = byDay.get(key);
      if (!bucket) continue;

      bucket.bids += 1;
      if (row.status === WON_STATUS) bucket.won += 1;
      if (isRespondedBucket(row.status)) bucket.responded += 1;
    }

    const body = dayKeys.map((date) => {
      const counts = byDay.get(date)!;
      return { date, bids: counts.bids, won: counts.won, responded: counts.responded };
    });

    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
