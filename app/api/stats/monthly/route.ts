import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewTeamWide } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

const WON_STATUS = "Won";

function isRespondedBucket(status: string): boolean {
  return status === "Responded" || status === "Interview";
}

function ymKeyUtc(y: number, mZeroBased: number): string {
  return `${y}-${String(mZeroBased + 1).padStart(2, "0")}`;
}

function utcMonthBounds(y: number, mZeroBased: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(y, mZeroBased, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, mZeroBased + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function formatMonthLabel(key: string): string {
  const [ys, ms] = key.split("-").map(Number);
  if (!Number.isFinite(ys) || !Number.isFinite(ms)) return key;
  const d = new Date(Date.UTC(ys, ms - 1, 1));
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });
}

/** Rolling window of full UTC calendar months (`months` default 6, max 24), oldest → newest (includes current). */
export async function GET(request: Request) {
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

    const url = new URL(request.url);
    let months = Number.parseInt(url.searchParams.get("months") ?? "6", 10);
    if (!Number.isFinite(months) || months < 1) months = 6;
    if (months > 24) months = 24;

    const now = new Date();
    const anchorY = now.getUTCFullYear();
    const anchorM = now.getUTCMonth();

    const keys: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(anchorY, anchorM - i, 1));
      keys.push(ymKeyUtc(d.getUTCFullYear(), d.getUTCMonth()));
    }

    const first = keys[0]!;
    const last = keys[keys.length - 1]!;
    const [fy, fm] = first.split("-").map(Number);
    const [ly, lm] = last.split("-").map(Number);
    const rangeStart = utcMonthBounds(fy!, fm! - 1).start;
    const rangeEnd = utcMonthBounds(ly!, lm! - 1).end;

    const whereBase = canViewTeamWide(actor.role) ? {} : { addedById: actor.id };

    const rows = await prisma.bid.findMany({
      where: {
        ...whereBase,
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: { date: true, status: true },
    });

    type Bucket = { bids: number; won: number; responded: number };
    const empty = (): Bucket => ({ bids: 0, won: 0, responded: 0 });
    const map = new Map<string, Bucket>();
    for (const k of keys) map.set(k, empty());

    for (const row of rows) {
      const k = ymKeyUtc(row.date.getUTCFullYear(), row.date.getUTCMonth());
      const b = map.get(k);
      if (!b) continue;
      b.bids += 1;
      if (row.status === WON_STATUS) b.won += 1;
      if (isRespondedBucket(row.status)) b.responded += 1;
    }

    const body = keys.map((key) => {
      const c = map.get(key)!;
      return {
        month: key,
        label: formatMonthLabel(key),
        bids: c.bids,
        won: c.won,
        responded: c.responded,
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
