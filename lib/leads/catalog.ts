export const LEAD_STATUS_OPTIONS = [
  "New",
  "Contacted",
  "Proposal Sent",
  "Follow-up",
  "Won",
  "Lost",
] as const;

export const LEAD_SOURCE_OPTIONS = [
  "Upwork",
  "Website",
  "Referral",
  "LinkedIn",
  "Email",
  "Manual",
] as const;

export type LeadStatus = (typeof LEAD_STATUS_OPTIONS)[number];

export function isValidLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUS_OPTIONS as readonly string[]).includes(value);
}
