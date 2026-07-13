import type { BidTableRow } from "@/components/dashboard/bids-types";

const KARACHI_FORMATTER = new Intl.DateTimeFormat("en-PK", {
  timeZone: "Asia/Karachi",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const EST_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatBidKarachiTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${KARACHI_FORMATTER.format(d)} PKT`;
}

export function formatBidEstTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${EST_FORMATTER.format(d)} ET`;
}

export function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function parseDateTimeLocal(value: string): Date | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDurationMs(ms: number): string {
  if (ms < 0) return "—";
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 1) return "<1m";
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}

/** Gap from the member's previous bid (by bid date, not createdAt). */
export function enrichBidRowsWithTiming(rows: BidTableRow[]): BidTableRow[] {
  const byUser = new Map<string, BidTableRow[]>();
  for (const row of rows) {
    const list = byUser.get(row.addedById) ?? [];
    list.push(row);
    byUser.set(row.addedById, list);
  }

  const timeSincePrevById = new Map<string, string | null>();

  for (const userBids of byUser.values()) {
    const sorted = [...userBids].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i]!;
      if (i === 0) {
        timeSincePrevById.set(current.id, null);
        continue;
      }
      const prev = sorted[i - 1]!;
      const diff = new Date(current.date).getTime() - new Date(prev.date).getTime();
      timeSincePrevById.set(current.id, formatDurationMs(diff));
    }
  }

  return rows.map((row) => ({
    ...row,
    karachiTime: formatBidKarachiTime(row.date),
    estTime: formatBidEstTime(row.date),
    timeSincePrev: timeSincePrevById.get(row.id) ?? null,
  }));
}
