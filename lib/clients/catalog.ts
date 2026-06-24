export const CLIENT_HISTORY_TYPES = [
  "Note",
  "Call",
  "Email",
  "Meeting",
  "Proposal",
  "Status Change",
] as const;

export type ClientHistoryType = (typeof CLIENT_HISTORY_TYPES)[number];

export function isValidClientHistoryType(value: string): value is ClientHistoryType {
  return (CLIENT_HISTORY_TYPES as readonly string[]).includes(value);
}
