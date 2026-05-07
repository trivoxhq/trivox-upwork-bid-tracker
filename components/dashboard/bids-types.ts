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
  value: number;
  notes: string | null;
  addedById: string;
  createdAt: string;
  updatedAt: string;
  addedBy: { name: string };
};
