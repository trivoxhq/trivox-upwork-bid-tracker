import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewTeamWide } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { pctNumeratorOverTotal } from "@/lib/stats/pct";

const WON_STATUS = "Won";
const RESPONSE_STATUSES = ["Responded", "Interview", "Won"] as const;

function parseIsoBoundary(
  raw: string | null,
): { ok: true; date: Date } | { ok: false; message: string } {
  if (!raw?.trim()) return { ok: true, date: new Date(0) };
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) {
    return { ok: false, message: "Invalid from/to date parameter." };
  }
  return { ok: true, date: d };
}

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
    const fromParsed = parseIsoBoundary(url.searchParams.get("from"));
    const toParsed = parseIsoBoundary(url.searchParams.get("to"));
    if (!fromParsed.ok) {
      return NextResponse.json({ success: false, message: fromParsed.message }, { status: 400 });
    }
    if (!toParsed.ok) {
      return NextResponse.json({ success: false, message: toParsed.message }, { status: 400 });
    }

    let dateFilter: { gte?: Date; lte?: Date } | undefined;
    const isFromEpoch = fromParsed.date.getTime() === new Date(0).getTime();
    if (!isFromEpoch || url.searchParams.get("to")) {
      dateFilter = {};
      if (!isFromEpoch) dateFilter.gte = fromParsed.date;
      if (url.searchParams.get("to")) dateFilter.lte = toParsed.date;
    }

    const scope = canViewTeamWide(actor.role) ? {} : { addedById: actor.id };
    const where = dateFilter ? { ...scope, date: dateFilter } : scope;

    const [totals, wonRows, respondedRows] = await Promise.all([
      prisma.bid.groupBy({
        by: ["profileId"],
        where,
        _count: { _all: true },
      }),
      prisma.bid.groupBy({
        by: ["profileId"],
        where: { ...where, status: WON_STATUS },
        _count: { _all: true },
        _sum: { value: true },
      }),
      prisma.bid.groupBy({
        by: ["profileId"],
        where: { ...where, status: { in: [...RESPONSE_STATUSES] } },
        _count: { _all: true },
      }),
    ]);

    const totalBy = new Map(totals.map((r) => [r.profileId, r._count._all]));
    const wonBy = new Map(wonRows.map((r) => [r.profileId, r._count._all]));
    const revenueBy = new Map(wonRows.map((r) => [r.profileId, r._sum.value ?? 0]));
    const respondedBy = new Map(respondedRows.map((r) => [r.profileId, r._count._all]));

    const profileIds = new Set([...totalBy.keys(), ...wonBy.keys(), ...respondedBy.keys()]);
    const profiles =
      profileIds.size > 0
        ? await prisma.profile.findMany({
            where: { id: { in: [...profileIds] } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(profiles.map((p) => [p.id, p.name]));

    const body = Array.from(profileIds)
      .sort((a, b) => (nameById.get(a) ?? a).localeCompare(nameById.get(b) ?? b))
      .map((profileId) => {
        const total = totalBy.get(profileId) ?? 0;
        const wonCount = wonBy.get(profileId) ?? 0;
        const respondedCount = respondedBy.get(profileId) ?? 0;
        return {
          profileId,
          profileName: nameById.get(profileId) ?? profileId,
          totalBids: total,
          wonCount,
          revenue: revenueBy.get(profileId) ?? 0,
          winRate: pctNumeratorOverTotal(wonCount, total),
          responseRate: pctNumeratorOverTotal(respondedCount, total),
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
