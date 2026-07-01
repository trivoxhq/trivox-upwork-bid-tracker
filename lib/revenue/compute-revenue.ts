import type { Role } from "@/generated/prisma-client";
import { canViewTeamWide } from "@/lib/auth/roles";
import { bidCountsTowardRevenue } from "@/lib/revenue/dedupe";
import type { RevenueSummaryPayload } from "@/lib/revenue/types";
import { prisma } from "@/lib/prisma";

type RevenueActor = { id: string; role: Role };

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function computeRevenueSummary(actor: RevenueActor): Promise<RevenueSummaryPayload> {
  const dealWhere = canViewTeamWide(actor.role)
    ? { stage: "Closed Won" as const }
    : {
        stage: "Closed Won" as const,
        OR: [{ ownerId: actor.id }, { createdById: actor.id }],
      };

  const bidScope = canViewTeamWide(actor.role) ? {} : { addedById: actor.id };

  const [wonDeals, wonBids] = await Promise.all([
    prisma.deal.findMany({
      where: dealWhere,
      select: {
        id: true,
        title: true,
        value: true,
        closedWonAt: true,
        updatedAt: true,
        owner: { select: { name: true } },
      },
      orderBy: [{ closedWonAt: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.bid.findMany({
      where: { ...bidScope, status: "Won" },
      select: {
        id: true,
        client: true,
        value: true,
        date: true,
        deal: { select: { stage: true } },
        addedBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  const countingBids = wonBids.filter(bidCountsTowardRevenue);
  const linkedBidsExcluded = wonBids.length - countingBids.length;

  const dealsWonTotal = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const bidsWonTotal = countingBids.reduce((sum, b) => sum + b.value, 0);

  const monthMap = new Map<string, { dealsWon: number; bidsWon: number }>();

  for (const deal of wonDeals) {
    const at = deal.closedWonAt ?? deal.updatedAt;
    const key = monthKey(at);
    const row = monthMap.get(key) ?? { dealsWon: 0, bidsWon: 0 };
    row.dealsWon += deal.value;
    monthMap.set(key, row);
  }

  for (const bid of countingBids) {
    const key = monthKey(bid.date);
    const row = monthMap.get(key) ?? { dealsWon: 0, bidsWon: 0 };
    row.bidsWon += bid.value;
    monthMap.set(key, row);
  }

  const byMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12)
    .map(([period, row]) => ({
      period,
      dealsWon: row.dealsWon,
      bidsWon: row.bidsWon,
      total: row.dealsWon + row.bidsWon,
    }));

  const recentWins = [
    ...wonDeals.map((deal) => ({
      id: deal.id,
      type: "deal" as const,
      title: deal.title,
      value: deal.value,
      closedAt: (deal.closedWonAt ?? deal.updatedAt).toISOString(),
      ownerName: deal.owner?.name ?? null,
    })),
    ...countingBids.map((bid) => ({
      id: bid.id,
      type: "bid" as const,
      title: bid.client,
      value: bid.value,
      closedAt: bid.date.toISOString(),
      ownerName: bid.addedBy.name,
    })),
  ]
    .sort((a, b) => b.closedAt.localeCompare(a.closedAt))
    .slice(0, 20);

  return {
    totals: {
      dealsWon: dealsWonTotal,
      bidsWon: bidsWonTotal,
      total: dealsWonTotal + bidsWonTotal,
      linkedBidsExcluded,
    },
    byMonth,
    recentWins,
  };
}
