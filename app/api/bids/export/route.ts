import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { buildBidsXlsxBuffer } from "@/lib/bids/build-bids-xlsx";
import { BID_EXPORT_HEADERS, buildBidExportRows } from "@/lib/bids/export-bids-rows";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const format = new URL(request.url).searchParams.get("format")?.toLowerCase() ?? "csv";

    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, isActive: true, role: true },
    });

    if (!actor?.isActive) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const where = actor.role === "admin" ? {} : { addedById: actor.id };
    const bids = await prisma.bid.findMany({
      where,
      orderBy: { date: "asc" },
      select: {
        date: true,
        client: true,
        status: true,
        value: true,
        notes: true,
        profile: { select: { name: true } },
        niche: { select: { name: true } },
      },
    });

    const headers = [...BID_EXPORT_HEADERS];
    const rows = buildBidExportRows(bids);
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "xlsx") {
      const buffer = buildBidsXlsxBuffer(headers, rows);
      const filename = `bids-export-${stamp}.xlsx`;
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const lines = [headers.join(",")];
    for (const row of rows) {
      lines.push(row.map(csvEscape).join(","));
    }
    const csv = lines.join("\n");
    const filename = `bids-export-${stamp}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
