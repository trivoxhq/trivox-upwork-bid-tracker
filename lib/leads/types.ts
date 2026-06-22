export type LeadUserSummary = {
  id: string;
  name: string;
  email: string;
};

export type LeadRow = {
  id: string;
  title: string;
  clientName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  assignedToId: string | null;
  assignedTo: LeadUserSummary | null;
  createdBy: LeadUserSummary;
  createdAt: string;
  updatedAt: string;
};
