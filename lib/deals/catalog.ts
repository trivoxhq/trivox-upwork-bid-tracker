export const DEAL_STAGE_OPTIONS = [
  "Qualification",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
] as const;

export type DealStage = (typeof DEAL_STAGE_OPTIONS)[number];

export function isValidDealStage(value: string): value is DealStage {
  return (DEAL_STAGE_OPTIONS as readonly string[]).includes(value);
}

export function isValidProbability(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}
