import { NextResponse } from "next/server";
import { getActiveActor } from "@/lib/auth/get-active-actor";
import { buildBidExportWhere } from "@/lib/filters/export-where";
import { buildBidExportRows, BID_EXPORT_HEADERS } from "@/lib/bids/export-bids-rows";
import { parseExportFormat, spreadsheetDownloadResponse } from "@/lib/spreadsheet/download-response";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const format = parseExportFormat(searchParams.get("format"));
    const actor = await getActiveActor();
    if (!actor?.isActive) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const bids = await prisma.bid.findMany({
      where: buildBidExportWhere(actor, searchParams),
      orderBy: { date: "asc" },
      select: {
        date: true,
        client: true,
        bidLink: true,
        status: true,
        value: true,
        connects: true,
        boost: true,
        notes: true,
        addedById: true,
        profile: { select: { name: true } },
        niche: { select: { name: true } },
        addedBy: { select: { name: true } },
      },
    });

    const rows = buildBidExportRows(bids);
    return spreadsheetDownloadResponse(BID_EXPORT_HEADERS, rows, format, "bids-export", "Bids");
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
