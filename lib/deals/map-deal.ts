import type { DealRow } from "@/lib/deals/types";

type UserSummary = { id: string; name: string; email: string };

type DealWithUsers = {
  id: string;
  title: string;
  clientName: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseAt: Date | null;
  lostReason: string | null;
  closedWonAt: Date | null;
  closedLostAt: Date | null;
  notes: string | null;
  ownerId: string | null;
  owner: UserSummary | null;
  createdBy: UserSummary;
  createdAt: Date;
  updatedAt: Date;
};

export const DEAL_INCLUDE_USERS = {
  owner: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

export function mapDealToRow(deal: DealWithUsers): DealRow {
  return {
    ...deal,
    expectedCloseAt: deal.expectedCloseAt?.toISOString() ?? null,
    closedWonAt: deal.closedWonAt?.toISOString() ?? null,
    closedLostAt: deal.closedLostAt?.toISOString() ?? null,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  };
}
