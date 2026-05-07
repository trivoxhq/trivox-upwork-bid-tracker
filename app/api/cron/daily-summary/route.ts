import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDailySummaryEmail } from "@/lib/email/resend-daily-summary";

const WON_STATUS = "Won";

function yesterdayUtcRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const start = new Date(Date.UTC(y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate(), 23, 59, 59, 999));
  const label = start.toISOString().slice(0, 10);
  return { start, end, label };
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { success: false, message: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const { start, end, label } = yesterdayUtcRange();

    const [totalBids, wonCount, revenueAgg, byUser] = await Promise.all([
      prisma.bid.count({ where: { date: { gte: start, lte: end } } }),
      prisma.bid.count({ where: { date: { gte: start, lte: end }, status: WON_STATUS } }),
      prisma.bid.aggregate({
        where: { date: { gte: start, lte: end }, status: WON_STATUS },
        _sum: { value: true },
      }),
      prisma.bid.groupBy({
        by: ["addedById"],
        where: { date: { gte: start, lte: end } },
        _count: { _all: true },
      }),
    ]);

    const revenue = revenueAgg._sum.value ?? 0;

    const userIds = byUser.map((r) => r.addedById);
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(users.map((u) => [u.id, u.name]));

    const lines = [
      `Daily summary (UTC) for ${label}`,
      ``,
      `Total bids logged: ${totalBids}`,
      `Won count: ${wonCount}`,
      `Revenue (Won): $${revenue}`,
      ``,
      `By team member:`,
      ...byUser
        .map((r) => {
          const name = nameById.get(r.addedById) ?? r.addedById;
          return `  • ${name}: ${r._count._all} bids`;
        })
        .sort(),
    ];

    const text = lines.join("\n");

    const emailResult = await sendDailySummaryEmail({
      dateLabel: label,
      totalBids,
      wonCount,
      revenue,
      text,
    });

    return NextResponse.json({
      success: true,
      date: label,
      totalBids,
      wonCount,
      revenue,
      emailSent: emailResult.ok,
      emailNote: emailResult.ok ? undefined : emailResult.skippedReason,
    });
  } catch (e) {
    console.error("[cron/daily-summary]", e);
    return NextResponse.json(
      { success: false, message: "Job failed. Check server logs." },
      { status: 500 },
    );
  }
}
