export type DealUserSummary = {
  id: string;
  name: string;
  email: string;
};

export type DealRow = {
  id: string;
  title: string;
  clientName: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseAt: string | null;
  lostReason: string | null;
  closedWonAt: string | null;
  closedLostAt: string | null;
  notes: string | null;
  ownerId: string | null;
  owner: DealUserSummary | null;
  createdBy: DealUserSummary;
  createdAt: string;
  updatedAt: string;
};
