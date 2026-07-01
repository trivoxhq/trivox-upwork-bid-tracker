import { NextResponse } from "next/server";
import { getActiveActor } from "@/lib/auth/get-active-actor";
import { parseExportFormat, spreadsheetDownloadResponse } from "@/lib/spreadsheet/download-response";
import {
  DEAL_EXPORT_HEADERS,
  DEAL_EXPORT_INCLUDE,
  buildDealExportRows,
  dealExportWhere,
} from "@/lib/deals/spreadsheet";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const format = parseExportFormat(new URL(request.url).searchParams.get("format"));
    const actor = await getActiveActor();
    if (!actor?.isActive) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const deals = await prisma.deal.findMany({
      where: dealExportWhere(actor),
      include: DEAL_EXPORT_INCLUDE,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    const rows = buildDealExportRows(deals);
    return spreadsheetDownloadResponse(DEAL_EXPORT_HEADERS, rows, format, "deals-export", "Deals");
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
