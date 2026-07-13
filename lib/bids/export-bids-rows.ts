/** Rows for bids CSV / Excel export — shared formatting. */

import {
  enrichBidRowsWithTiming,
  formatBidEstTime,
  formatBidKarachiTime,
} from "@/lib/bids/time-display";
import type { BidTableRow } from "@/components/dashboard/bids-types";

export const BID_EXPORT_HEADERS = [
  "Date",
  "Karachi (PKT)",
  "EST (ET)",
  "Profile",
  "Client",
  "Niche",
  "Status",
  "Value",
  "Connects",
  "Boost",
  "Time Since Prev",
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
  connects: number;
  boost: number;
  notes: string | null;
  addedById: string;
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
  const stubRows: BidTableRow[] = bids.map((bid, index) => ({
    id: `export-${index}`,
    date: bid.date.toISOString(),
    profileId: "",
    profileName: bid.profile.name,
    nicheId: "",
    nicheName: bid.niche.name,
    client: bid.client,
    bidLink: bid.bidLink,
    status: bid.status,
    lostReason: null,
    dealId: null,
    dealTitle: null,
    value: Number(bid.value),
    connects: bid.connects,
    boost: bid.boost,
    notes: bid.notes,
    addedById: bid.addedById,
    createdAt: bid.date.toISOString(),
    updatedAt: bid.date.toISOString(),
    addedBy: bid.addedBy,
    karachiTime: "",
    estTime: "",
    timeSincePrev: null,
    memberEditLocked: true,
  }));

  const enriched = enrichBidRowsWithTiming(stubRows);

  return bids.map((bid, index) => {
    const row = enriched[index]!;
    const iso = bid.date.toISOString();
    return [
      iso.slice(0, 19).replace("T", " "),
      formatBidKarachiTime(iso),
      formatBidEstTime(iso),
      capitalizeCsvField(bid.profile.name),
      capitalizeCsvField(bid.client),
      capitalizeCsvField(bid.niche.name),
      capitalizeCsvField(bid.status),
      String(bid.value),
      String(bid.connects),
      String(bid.boost),
      row.timeSincePrev ?? "",
      capitalizeCsvField(bid.bidLink ?? ""),
      capitalizeCsvField(bid.notes ?? ""),
      capitalizeCsvField(bid.addedBy.name),
    ];
  });
}
