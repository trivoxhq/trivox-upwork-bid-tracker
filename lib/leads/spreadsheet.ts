import { isValidLeadStatus } from "@/lib/leads/catalog";
import type { ImportResult, UserLookup } from "@/lib/spreadsheet/import-helpers";
import {
  pickField,
  resolveUserRef,
  rowToRecord,
} from "@/lib/spreadsheet/import-helpers";
import { canAssign, canViewTeamWide } from "@/lib/auth/roles";
import type { Role } from "@/generated/prisma-client";
import { prisma } from "@/lib/prisma";

export const LEAD_EXPORT_HEADERS = [
  "Title",
  "Client Name",
  "Email",
  "Phone",
  "Company",
  "Country",
  "Source",
  "Status",
  "Notes",
  "Assigned To",
  "Created By",
  "Created At",
] as const;

type LeadExportSource = {
  title: string;
  clientName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  assignedTo: { name: string; email: string } | null;
  createdBy: { name: string };
  createdAt: Date;
};

export function buildLeadExportRows(leads: LeadExportSource[]): string[][] {
  return leads.map((lead) => [
    lead.title,
    lead.clientName,
    lead.email ?? "",
    lead.phone ?? "",
    lead.company ?? "",
    lead.country ?? "",
    lead.source ?? "",
    lead.status,
    lead.notes ?? "",
    lead.assignedTo ? `${lead.assignedTo.name} (${lead.assignedTo.email})` : "",
    lead.createdBy.name,
    lead.createdAt.toISOString().slice(0, 10),
  ]);
}

export async function importLeadRows(
  headers: string[],
  rows: string[][],
  actor: { id: string; role: Role },
  users: UserLookup[],
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const record = rowToRecord(headers, rows[i]);
    const rowErrors: string[] = [];

    const title = pickField(record, "title");
    const clientName = pickField(record, "client_name", "client");
    if (!title) rowErrors.push("Title is required.");
    if (!clientName) rowErrors.push("Client Name is required.");

    const status = pickField(record, "status") || "New";
    if (status && !isValidLeadStatus(status)) {
      rowErrors.push("Status must be a valid pipeline stage.");
    }

    let assignedToId: string | null = null;
    const assignRef = pickField(record, "assigned_to", "assignee", "owner");
    if (canAssign(actor.role)) {
      if (assignRef) {
        assignedToId = resolveUserRef(assignRef, users);
        if (!assignedToId) rowErrors.push("Assigned To could not be matched to a team member.");
      }
    } else {
      assignedToId = actor.id;
    }

    if (rowErrors.length > 0) {
      result.failed += 1;
      result.errors.push({ row: rowNum, message: rowErrors.join(" ") });
      continue;
    }

    try {
      await prisma.lead.create({
        data: {
          title: title!,
          clientName: clientName!,
          email: pickField(record, "email") || null,
          phone: pickField(record, "phone") || null,
          company: pickField(record, "company") || null,
          country: pickField(record, "country") || null,
          source: pickField(record, "source") || null,
          status,
          notes: pickField(record, "notes") || null,
          assignedToId,
          createdById: actor.id,
        },
      });
      result.created += 1;
    } catch {
      result.failed += 1;
      result.errors.push({ row: rowNum, message: "Could not save lead." });
    }
  }

  return result;
}

export function leadExportWhere(actor: { id: string; role: Role }) {
  return canViewTeamWide(actor.role)
    ? undefined
    : {
        OR: [{ assignedToId: actor.id }, { createdById: actor.id }],
      };
}

export const LEAD_EXPORT_INCLUDE = {
  assignedTo: { select: { name: true, email: true } },
  createdBy: { select: { name: true } },
} as const;
