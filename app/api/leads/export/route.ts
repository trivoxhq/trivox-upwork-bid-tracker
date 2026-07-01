import { NextResponse } from "next/server";
import { getActiveActor } from "@/lib/auth/get-active-actor";
import { parseExportFormat, spreadsheetDownloadResponse } from "@/lib/spreadsheet/download-response";
import { buildLeadExportWhere } from "@/lib/filters/export-where";
import {
  LEAD_EXPORT_HEADERS,
  LEAD_EXPORT_INCLUDE,
  buildLeadExportRows,
} from "@/lib/leads/spreadsheet";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const format = parseExportFormat(searchParams.get("format"));
    const actor = await getActiveActor();
    if (!actor?.isActive) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      where: buildLeadExportWhere(actor, searchParams),
      include: LEAD_EXPORT_INCLUDE,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    const rows = buildLeadExportRows(leads);
    return spreadsheetDownloadResponse(LEAD_EXPORT_HEADERS, rows, format, "leads-export", "Leads");
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
