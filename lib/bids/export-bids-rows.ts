/** Rows for bids CSV / Excel export — shared formatting. */

export const BID_EXPORT_HEADERS = [
  "Date",
  "Profile",
  "Client",
  "Niche",
  "Status",
  "Value",
  "Bid Link",
  "Notes",
  "Added By",
] as const;

export type BidExportSource = {
  date: Date;
  client: string;
  bidLink: string | null;
  status: string;
  value: { toString(): string } | string | number;
  notes: string | null;
  profile: { name: string };
  niche: { name: string };
  addedBy: { name: string };
};

/** Title-case each whitespace-delimited word on one line (spreadsheet-friendly). */
export function capitalizeCsvLine(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}

/** Same as capitalizeCsvLine, but keeps newline breaks (e.g. notes). */
export function capitalizeCsvField(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.includes("\n")) return capitalizeCsvLine(normalized);
  return normalized.split("\n").map((line) => capitalizeCsvLine(line)).join("\n");
}

export function buildBidExportRows(bids: BidExportSource[]): string[][] {
  return bids.map((bid) => [
    bid.date.toISOString().slice(0, 10),
    capitalizeCsvField(bid.profile.name),
    capitalizeCsvField(bid.client),
    capitalizeCsvField(bid.niche.name),
    capitalizeCsvField(bid.status),
    String(bid.value),
    capitalizeCsvField(bid.bidLink ?? ""),
    capitalizeCsvField(bid.notes ?? ""),
    capitalizeCsvField(bid.addedBy.name),
  ]);
}
