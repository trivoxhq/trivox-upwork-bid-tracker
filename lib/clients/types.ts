export type ClientUserSummary = {
  id: string;
  name: string;
  email: string;
};

export type ClientHistoryRow = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  occurredAt: string;
  createdAt: string;
  createdBy: ClientUserSummary;
};

export type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  source: string | null;
  notes: string | null;
  createdBy: ClientUserSummary;
  history: ClientHistoryRow[];
  createdAt: string;
  updatedAt: string;
};
