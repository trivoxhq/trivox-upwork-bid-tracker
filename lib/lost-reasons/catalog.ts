export const LOST_REASON_OPTIONS = [
  "Budget",
  "Chose competitor",
  "No response",
  "Not a fit",
  "Timing",
  "Other",
] as const;

export type LostReasonOption = (typeof LOST_REASON_OPTIONS)[number];

export function isValidLostReason(value: string): value is LostReasonOption {
  return (LOST_REASON_OPTIONS as readonly string[]).includes(value);
}

export function isLostLeadStatus(status: string): boolean {
  return status === "Lost";
}

export function isLostDealStage(stage: string): boolean {
  return stage === "Closed Lost";
}

export function isLostBidStatus(status: string): boolean {
  return status === "Lost";
}
