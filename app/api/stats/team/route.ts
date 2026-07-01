import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeamStatsApi } from "@/lib/auth/require-team-stats-api";

const WON_STATUS = "Won";

function pctRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export async function GET() {
  try {
    const gate = await requireTeamStatsApi();
    if (!gate.ok) return gate.response;

    const users = await prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const payload = [];

    for (const u of users) {
      const base = { addedById: u.id };
      const [totalBids, wonCount, agg] = await Promise.all([
        prisma.bid.count({ where: base }),
        prisma.bid.count({ where: { ...base, status: WON_STATUS } }),
        prisma.bid.aggregate({
          where: { ...base, status: WON_STATUS },
          _sum: { value: true },
        }),
      ]);

      payload.push({
        userId: u.id,
        name: u.name,
        totalBids,
        wonCount,
        winRate: pctRate(wonCount, totalBids),
        revenue: agg._sum.value ?? 0,
      });
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
