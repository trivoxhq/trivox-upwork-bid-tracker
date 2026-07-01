import { isValidDealStage, isValidProbability } from "@/lib/deals/catalog";
import type { ImportResult, UserLookup } from "@/lib/spreadsheet/import-helpers";
import {
  parseIntWithDefault,
  parseOptionalDate,
  pickField,
  resolveUserRef,
  rowToRecord,
} from "@/lib/spreadsheet/import-helpers";
import { canAssign, canViewTeamWide } from "@/lib/auth/roles";
import type { Role } from "@/generated/prisma-client";
import { prisma } from "@/lib/prisma";

export const DEAL_EXPORT_HEADERS = [
  "Title",
  "Client Name",
  "Value",
  "Stage",
  "Probability",
  "Expected Close",
  "Notes",
  "Owner",
  "Created By",
  "Created At",
] as const;

type DealExportSource = {
  title: string;
  clientName: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseAt: Date | null;
  notes: string | null;
  owner: { name: string; email: string } | null;
  createdBy: { name: string };
  createdAt: Date;
};

export function buildDealExportRows(deals: DealExportSource[]): string[][] {
  return deals.map((deal) => [
    deal.title,
    deal.clientName,
    String(deal.value),
    deal.stage,
    String(deal.probability),
    deal.expectedCloseAt ? deal.expectedCloseAt.toISOString().slice(0, 10) : "",
    deal.notes ?? "",
    deal.owner ? `${deal.owner.name} (${deal.owner.email})` : "",
    deal.createdBy.name,
    deal.createdAt.toISOString().slice(0, 10),
  ]);
}

export async function importDealRows(
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

    const stage = pickField(record, "stage") || "Qualification";
    if (!isValidDealStage(stage)) rowErrors.push("Stage must be a valid deal stage.");

    const probability = parseIntWithDefault(
      pickField(record, "probability", "prob"),
      0,
      "Probability",
      rowErrors,
    );
    if (probability !== 0 && !isValidProbability(probability)) {
      rowErrors.push("Probability must be 0–100.");
    }

    const value = parseIntWithDefault(pickField(record, "value", "amount"), 0, "Value", rowErrors);
    const expectedCloseAt = parseOptionalDate(
      pickField(record, "expected_close", "expected_close_at", "close_date"),
      "Expected Close",
      rowErrors,
    );

    let ownerId: string | null = null;
    const ownerRef = pickField(record, "owner", "assigned_to", "assignee");
    if (canAssign(actor.role)) {
      if (ownerRef) {
        ownerId = resolveUserRef(ownerRef, users);
        if (!ownerId) rowErrors.push("Owner could not be matched to a team member.");
      }
    } else {
      ownerId = actor.id;
    }

    if (rowErrors.length > 0) {
      result.failed += 1;
      result.errors.push({ row: rowNum, message: rowErrors.join(" ") });
      continue;
    }

    try {
      await prisma.deal.create({
        data: {
          title: title!,
          clientName: clientName!,
          value,
          stage,
          probability,
          expectedCloseAt,
          notes: pickField(record, "notes") || null,
          ownerId,
          createdById: actor.id,
        },
      });
      result.created += 1;
    } catch {
      result.failed += 1;
      result.errors.push({ row: rowNum, message: "Could not save deal." });
    }
  }

  return result;
}

export function dealExportWhere(actor: { id: string; role: Role }) {
  return canViewTeamWide(actor.role)
    ? undefined
    : {
        OR: [{ ownerId: actor.id }, { createdById: actor.id }],
      };
}

export const DEAL_EXPORT_INCLUDE = {
  owner: { select: { name: true, email: true } },
  createdBy: { select: { name: true } },
} as const;
