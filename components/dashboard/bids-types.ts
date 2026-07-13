/** Serialized bid row passed from the server into client table components. */
export type BidTableRow = {
  id: string;
  date: string;
  profileId: string;
  profileName: string;
  nicheId: string;
  nicheName: string;
  client: string;
  bidLink: string | null;
  status: string;
  lostReason: string | null;
  dealId: string | null;
  dealTitle: string | null;
  value: number;
  connects: number;
  boost: number;
  notes: string | null;
  addedById: string;
  createdAt: string;
  updatedAt: string;
  addedBy: { name: string };
  karachiTime: string;
  estTime: string;
  timeSincePrev: string | null;
  /** Members can add bids only; admins can edit existing bids. */
  memberEditLocked: boolean;
};
