import type { LeadRow } from "@/lib/leads/types";

type LeadWithUsers = {
  id: string;
  title: string;
  clientName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  source: string | null;
  status: string;
  lostReason: string | null;
  notes: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string };
  createdAt: Date;
  updatedAt: Date;
};

export const LEAD_INCLUDE_USERS = {
  assignedTo: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

export function mapLeadToRow(lead: LeadWithUsers): LeadRow {
  return {
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}
