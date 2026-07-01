export type RevenuePeriodRow = {
  period: string;
  dealsWon: number;
  bidsWon: number;
  total: number;
};

export type RevenueSummaryPayload = {
  totals: {
    dealsWon: number;
    bidsWon: number;
    total: number;
    linkedBidsExcluded: number;
  };
  byMonth: RevenuePeriodRow[];
  recentWins: {
    id: string;
    type: "deal" | "bid";
    title: string;
    value: number;
    closedAt: string;
    ownerName: string | null;
  }[];
};
