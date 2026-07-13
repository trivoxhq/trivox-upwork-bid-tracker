import type { BidTableRow } from "@/components/dashboard/bids-types";
import { enrichBidRowsWithTiming } from "@/lib/bids/time-display";
import { listBidsForActor } from "@/lib/bids/list-bids-for-actor";

export function mapBidsToTableRows(
  bids: Awaited<ReturnType<typeof listBidsForActor>>,
): BidTableRow[] {
  const rows = bids.map((b) => ({
    id: b.id,
    date: b.date.toISOString(),
    profileId: b.profileId,
    profileName: b.profile.name,
    nicheId: b.nicheId,
    nicheName: b.niche.name,
    client: b.client,
    bidLink: b.bidLink,
    status: b.status,
    lostReason: b.lostReason,
    dealId: b.dealId,
    dealTitle: b.deal?.title ?? null,
    value: b.value,
    connects: b.connects,
    boost: b.boost,
    notes: b.notes,
    addedById: b.addedById,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    addedBy: { name: b.addedBy.name },
    karachiTime: "",
    estTime: "",
    timeSincePrev: null,
    memberEditLocked: b.memberEditLocked,
  }));

  return enrichBidRowsWithTiming(rows);
}
