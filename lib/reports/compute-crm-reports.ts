import { DEAL_STAGE_OPTIONS } from "@/lib/deals/catalog";
import { LEAD_STATUS_OPTIONS } from "@/lib/leads/catalog";
import type { Role } from "@/generated/prisma-client";
import { canViewTeamWide } from "@/lib/auth/roles";
import { bidCountsTowardRevenue } from "@/lib/revenue/dedupe";
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

  const [leads, deals, wonBids, bidsTotal, bidsWonCount] = await Promise.all([
    prisma.lead.findMany({
      where: leadWhere,
      select: { status: true, source: true, lostReason: true },
    }),
    prisma.deal.findMany({
      where: dealWhere,
      select: { stage: true, value: true, probability: true, lostReason: true },
    }),
    prisma.bid.findMany({
      where: { ...bidWhere, status: "Won" },
      select: { value: true, deal: { select: { stage: true } } },
    }),
    prisma.bid.count({ where: bidWhere }),
    prisma.bid.count({ where: { ...bidWhere, status: "Won" } }),
  ]);

  const leadsByStage = Object.fromEntries(LEAD_STATUS_OPTIONS.map((stage) => [stage, 0]));
  const lostBySourceMap = new Map<string, number>();
  const lostByReasonMap = new Map<string, number>();

  for (const lead of leads) {
    if (leadsByStage[lead.status] !== undefined) {
      leadsByStage[lead.status]++;
    } else {
      leadsByStage[lead.status] = 1;
    }

    if (lead.status === "Lost") {
      const source = lead.source?.trim() || "Unknown";
      lostBySourceMap.set(source, (lostBySourceMap.get(source) ?? 0) + 1);
      const reason = lead.lostReason?.trim() || "Unspecified";
      lostByReasonMap.set(reason, (lostByReasonMap.get(reason) ?? 0) + 1);
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
    } else if (deal.stage === "Closed Lost") {
      const reason = deal.lostReason?.trim() || "Unspecified";
      lostByReasonMap.set(reason, (lostByReasonMap.get(reason) ?? 0) + 1);
    } else {
      pipelineValue += deal.value;
      weightedPipelineValue += (deal.value * deal.probability) / 100;
    }
  }

  const dealsClosedWon = dealsByStage["Closed Won"] ?? 0;
  const dealsClosedLost = dealsByStage["Closed Lost"] ?? 0;
  const dealsClosed = dealsClosedWon + dealsClosedLost;
  const dealWinRate = pctNumeratorOverTotal(dealsClosedWon, dealsClosed);

  const countingBids = wonBids.filter(bidCountsTowardRevenue);
  const bidsWonRevenue = countingBids.reduce((sum, bid) => sum + bid.value, 0);
  const linkedBidsExcluded = wonBids.length - countingBids.length;
  const bidWinRate = pctNumeratorOverTotal(bidsWonCount, bidsTotal);

  const lostByReason = Array.from(lostByReasonMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

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
      linkedBidsExcluded,
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
      lostByReason,
    },
  };
}
