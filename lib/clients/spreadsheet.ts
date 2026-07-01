import type { ImportResult } from "@/lib/spreadsheet/import-helpers";
import { pickField, rowToRecord } from "@/lib/spreadsheet/import-helpers";
import { prisma } from "@/lib/prisma";

export const CLIENT_EXPORT_HEADERS = [
  "Name",
  "Email",
  "Phone",
  "Company",
  "Country",
  "Source",
  "Notes",
  "Created By",
  "Created At",
] as const;

type ClientExportSource = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  country: string | null;
  source: string | null;
  notes: string | null;
  createdBy: { name: string };
  createdAt: Date;
};

export function buildClientExportRows(clients: ClientExportSource[]): string[][] {
  return clients.map((client) => [
    client.name,
    client.email ?? "",
    client.phone ?? "",
    client.company ?? "",
    client.country ?? "",
    client.source ?? "",
    client.notes ?? "",
    client.createdBy.name,
    client.createdAt.toISOString().slice(0, 10),
  ]);
}

export async function importClientRows(
  headers: string[],
  rows: string[][],
  actorId: string,
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const record = rowToRecord(headers, rows[i]);
    const name = pickField(record, "name", "client_name", "client");
    if (!name) {
      result.failed += 1;
      result.errors.push({ row: rowNum, message: "Name is required." });
      continue;
    }

    try {
      await prisma.client.create({
        data: {
          name,
          email: pickField(record, "email") || null,
          phone: pickField(record, "phone") || null,
          company: pickField(record, "company") || null,
          country: pickField(record, "country") || null,
          source: pickField(record, "source") || null,
          notes: pickField(record, "notes") || null,
          createdById: actorId,
        },
      });
      result.created += 1;
    } catch {
      result.failed += 1;
      result.errors.push({ row: rowNum, message: "Could not save client." });
    }
  }

  return result;
}

export const CLIENT_EXPORT_INCLUDE = {
  createdBy: { select: { name: true } },
} as const;
