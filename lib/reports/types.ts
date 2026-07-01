export type LostBySourceRow = {
  source: string;
  count: number;
};

export type CrmReportsPayload = {
  leads: {
    total: number;
    byStage: Record<string, number>;
    won: number;
    lost: number;
    open: number;
    conversionRate: number;
  };
  deals: {
    total: number;
    byStage: Record<string, number>;
    closedWon: number;
    closedLost: number;
    open: number;
    pipelineValue: number;
    weightedPipelineValue: number;
    wonRevenue: number;
    winRate: number;
  };
  revenue: {
    dealsWon: number;
    bidsWon: number;
    total: number;
  };
  winRate: {
    leads: number;
    deals: number;
    bids: number;
  };
  lostOverview: {
    leadsLost: number;
    dealsClosedLost: number;
    leadsLostBySource: LostBySourceRow[];
  };
};
