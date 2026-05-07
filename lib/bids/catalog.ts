/** Bid status labels — validate on write. Profile/niche are dynamic (DB). */

export const BID_STATUS_LABELS = ["New", "Responded", "Interview", "Won", "Lost"] as const;

export function isValidBidStatus(value: string): boolean {
  return (BID_STATUS_LABELS as readonly string[]).includes(value);
}
