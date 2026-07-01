/** Bids linked to a Closed Won deal are excluded from bid revenue to avoid double counting. */
export function bidCountsTowardRevenue(bid: { deal: { stage: string } | null }): boolean {
  if (!bid.deal) return true;
  return bid.deal.stage !== "Closed Won";
}
