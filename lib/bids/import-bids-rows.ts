import { isValidBidStatus } from "@/lib/bids/catalog";
import type { ImportResult } from "@/lib/spreadsheet/import-helpers";
import {
  parseIntWithDefault,
  parseRequiredDate,
  pickField,
  rowToRecord,
} from "@/lib/spreadsheet/import-helpers";
import { prisma } from "@/lib/prisma";

type CatalogLookup = { id: string; name: string };

function resolveCatalogByName(name: string, items: CatalogLookup[]): string | null {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  const matches = items.filter((item) => item.name.trim().toLowerCase() === needle);
  return matches.length === 1 ? matches[0].id : null;
}

export async function importBidRows(
  headers: string[],
  rows: string[][],
  actorId: string,
): Promise<ImportResult> {
  const [profiles, niches] = await Promise.all([
    prisma.profile.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.niche.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);

  const result: ImportResult = { created: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const record = rowToRecord(headers, rows[i]);
    const rowErrors: string[] = [];

    const date = parseRequiredDate(pickField(record, "date"), "Date", rowErrors);
    const client = pickField(record, "client");
    const profileName = pickField(record, "profile");
    const nicheName = pickField(record, "niche");

    if (!client) rowErrors.push("Client is required.");
    if (!profileName) rowErrors.push("Profile is required.");
    if (!nicheName) rowErrors.push("Niche is required.");

    const profileId = profileName ? resolveCatalogByName(profileName, profiles) : null;
    const nicheId = nicheName ? resolveCatalogByName(nicheName, niches) : null;
    if (profileName && !profileId) rowErrors.push("Profile name not found in catalog.");
    if (nicheName && !nicheId) rowErrors.push("Niche name not found in catalog.");

    const status = pickField(record, "status") || "New";
    if (status && !isValidBidStatus(status)) rowErrors.push("Status must be a valid bid status.");

    const value = parseIntWithDefault(pickField(record, "value", "amount"), 0, "Value", rowErrors);
    const connects = parseIntWithDefault(pickField(record, "connects"), 0, "Connects", rowErrors);
    const boost = parseIntWithDefault(pickField(record, "boost"), 0, "Boost", rowErrors);

    if (rowErrors.length > 0 || !date || !profileId || !nicheId) {
      result.failed += 1;
      result.errors.push({ row: rowNum, message: rowErrors.join(" ") || "Invalid row." });
      continue;
    }

    try {
      await prisma.bid.create({
        data: {
          date,
          profileId,
          nicheId,
          client,
          bidLink: pickField(record, "bid_link", "link", "url") || null,
          status,
          value,
          connects,
          boost,
          notes: pickField(record, "notes") || null,
          addedById: actorId,
        },
      });
      result.created += 1;
    } catch {
      result.failed += 1;
      result.errors.push({ row: rowNum, message: "Could not save bid." });
    }
  }

  return result;
}
