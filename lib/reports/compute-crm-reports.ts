import { DEAL_STAGE_OPTIONS } from "@/lib/deals/catalog";
import { LEAD_STATUS_OPTIONS } from "@/lib/leads/catalog";
import type { Role } from "@/generated/prisma-client";
import { canViewTeamWide } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { pctNumeratorOverTotal } from "@/lib/stats/pct";
import type { CrmReportsPayload } from "@/lib/reports/types";

type ReportActor = {
  id: string;
  role: Role;
};

export async function computeCrmReports(actor: ReportActor): Promise<CrmReportsPayload> {
  const leadWhere = canViewTeamWide(actor.role)
    ? {}
    : {
        OR: [{ assignedToId: actor.id }, { createdById: actor.id }],
      };

  const dealWhere = canViewTeamWide(actor.role)
    ? {}
    : {
        OR: [{ ownerId: actor.id }, { createdById: actor.id }],
      };

  const bidWhere = canViewTeamWide(actor.role) ? {} : { addedById: actor.id };

  const [leads, deals, bidsWonAgg, bidsTotal, bidsWonCount] = await Promise.all([
    prisma.lead.findMany({
      where: leadWhere,
      select: { status: true, source: true },
    }),
    prisma.deal.findMany({
      where: dealWhere,
      select: { stage: true, value: true, probability: true },
    }),
    prisma.bid.aggregate({
      where: { ...bidWhere, status: "Won" },
      _sum: { value: true },
    }),
    prisma.bid.count({ where: bidWhere }),
    prisma.bid.count({ where: { ...bidWhere, status: "Won" } }),
  ]);

  const leadsByStage = Object.fromEntries(LEAD_STATUS_OPTIONS.map((stage) => [stage, 0]));
  const lostBySourceMap = new Map<string, number>();

  for (const lead of leads) {
    if (leadsByStage[lead.status] !== undefined) {
      leadsByStage[lead.status]++;
    } else {
      leadsByStage[lead.status] = 1;
    }

    if (lead.status === "Lost") {
      const source = lead.source?.trim() || "Unknown";
      lostBySourceMap.set(source, (lostBySourceMap.get(source) ?? 0) + 1);
    }
  }

  const leadsWon = leadsByStage.Won ?? 0;
  const leadsLost = leadsByStage.Lost ?? 0;
  const leadsClosed = leadsWon + leadsLost;
  const leadConversionRate = pctNumeratorOverTotal(leadsWon, leadsClosed);

  const leadsLostBySource = Array.from(lostBySourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const dealsByStage = Object.fromEntries(DEAL_STAGE_OPTIONS.map((stage) => [stage, 0]));
  let pipelineValue = 0;
  let weightedPipelineValue = 0;
  let dealsWonRevenue = 0;

  for (const deal of deals) {
    if (dealsByStage[deal.stage] !== undefined) {
      dealsByStage[deal.stage]++;
    } else {
      dealsByStage[deal.stage] = 1;
    }

    if (deal.stage === "Closed Won") {
      dealsWonRevenue += deal.value;
    } else if (deal.stage !== "Closed Lost") {
      pipelineValue += deal.value;
      weightedPipelineValue += (deal.value * deal.probability) / 100;
    }
  }

  const dealsClosedWon = dealsByStage["Closed Won"] ?? 0;
  const dealsClosedLost = dealsByStage["Closed Lost"] ?? 0;
  const dealsClosed = dealsClosedWon + dealsClosedLost;
  const dealWinRate = pctNumeratorOverTotal(dealsClosedWon, dealsClosed);

  const bidsWonRevenue = bidsWonAgg._sum.value ?? 0;
  const bidWinRate = pctNumeratorOverTotal(bidsWonCount, bidsTotal);

  return {
    leads: {
      total: leads.length,
      byStage: leadsByStage,
      won: leadsWon,
      lost: leadsLost,
      open: leads.length - leadsClosed,
      conversionRate: leadConversionRate,
    },
    deals: {
      total: deals.length,
      byStage: dealsByStage,
      closedWon: dealsClosedWon,
      closedLost: dealsClosedLost,
      open: deals.length - dealsClosed,
      pipelineValue,
      weightedPipelineValue: Math.round(weightedPipelineValue),
      wonRevenue: dealsWonRevenue,
      winRate: dealWinRate,
    },
    revenue: {
      dealsWon: dealsWonRevenue,
      bidsWon: bidsWonRevenue,
      total: dealsWonRevenue + bidsWonRevenue,
    },
    winRate: {
      leads: leadConversionRate,
      deals: dealWinRate,
      bids: bidWinRate,
    },
    lostOverview: {
      leadsLost,
      dealsClosedLost,
      leadsLostBySource,
    },
  };
}
