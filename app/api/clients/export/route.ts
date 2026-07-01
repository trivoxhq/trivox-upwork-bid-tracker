import { NextResponse } from "next/server";
import { getActiveActor } from "@/lib/auth/get-active-actor";
import { buildClientExportWhere } from "@/lib/filters/export-where";
import { parseExportFormat, spreadsheetDownloadResponse } from "@/lib/spreadsheet/download-response";
import {
  CLIENT_EXPORT_HEADERS,
  CLIENT_EXPORT_INCLUDE,
  buildClientExportRows,
} from "@/lib/clients/spreadsheet";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const format = parseExportFormat(searchParams.get("format"));
    const actor = await getActiveActor();
    if (!actor?.isActive) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const clients = await prisma.client.findMany({
      where: buildClientExportWhere(actor, searchParams),
      include: CLIENT_EXPORT_INCLUDE,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    const rows = buildClientExportRows(clients);
    return spreadsheetDownloadResponse(CLIENT_EXPORT_HEADERS, rows, format, "clients-export", "Clients");
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
