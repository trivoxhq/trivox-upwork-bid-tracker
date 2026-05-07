import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  try {
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

    const headers = ["date", "profile", "client", "niche", "status", "value", "notes"];
    const lines = [headers.join(",")];

    for (const bid of bids) {
      const row = [
        bid.date.toISOString().slice(0, 10),
        bid.profile.name,
        bid.client,
        bid.niche.name,
        bid.status,
        String(bid.value),
        bid.notes ?? "",
      ].map(csvEscape);
      lines.push(row.join(","));
    }

    const csv = lines.join("\n");
    const stamp = new Date().toISOString().slice(0, 10);
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
