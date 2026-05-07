import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
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

    const scope = actor.role === "admin" ? {} : { addedById: actor.id };
    const where = dateFilter ? { ...scope, date: dateFilter } : scope;

    const [totals, wonRows, respondedRows] = await Promise.all([
      prisma.bid.groupBy({
        by: ["nicheId"],
        where,
        _count: { _all: true },
      }),
      prisma.bid.groupBy({
        by: ["nicheId"],
        where: { ...where, status: WON_STATUS },
        _count: { _all: true },
        _sum: { value: true },
      }),
      prisma.bid.groupBy({
        by: ["nicheId"],
        where: { ...where, status: { in: [...RESPONSE_STATUSES] } },
        _count: { _all: true },
      }),
    ]);

    const totalBy = new Map(totals.map((r) => [r.nicheId, r._count._all]));
    const wonCountBy = new Map(wonRows.map((r) => [r.nicheId, r._count._all]));
    const revenueBy = new Map(wonRows.map((r) => [r.nicheId, r._sum.value ?? 0]));
    const respondedBy = new Map(respondedRows.map((r) => [r.nicheId, r._count._all]));

    const nicheIds = new Set([...totalBy.keys(), ...wonCountBy.keys(), ...respondedBy.keys()]);
    const niches =
      nicheIds.size > 0
        ? await prisma.niche.findMany({
            where: { id: { in: [...nicheIds] } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(niches.map((n) => [n.id, n.name]));

    const body = Array.from(nicheIds)
      .sort((a, b) => (nameById.get(a) ?? a).localeCompare(nameById.get(b) ?? b))
      .map((nicheId) => {
        const total = totalBy.get(nicheId) ?? 0;
        const wonCount = wonCountBy.get(nicheId) ?? 0;
        const respondedCount = respondedBy.get(nicheId) ?? 0;
        return {
          nicheId,
          nicheName: nameById.get(nicheId) ?? nicheId,
          totalBids: total,
          wonCount,
          revenue: revenueBy.get(nicheId) ?? 0,
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
