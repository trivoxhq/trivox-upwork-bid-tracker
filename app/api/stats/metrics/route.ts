import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { pctNumeratorOverTotal } from "@/lib/stats/pct";

const RESPONSE_STATUSES = ["Responded", "Interview", "Won"] as const;
const WON_STATUS = "Won";

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

    const [total, respondedInterviewWon, wonCount, wonSum] = await Promise.all([
      prisma.bid.count({ where }),
      prisma.bid.count({
        where: {
          ...where,
          status: { in: [...RESPONSE_STATUSES] },
        },
      }),
      prisma.bid.count({
        where: { ...where, status: WON_STATUS },
      }),
      prisma.bid.aggregate({
        where: { ...where, status: WON_STATUS },
        _sum: { value: true },
      }),
    ]);

    const responseRate = pctNumeratorOverTotal(respondedInterviewWon, total);
    const winRate = pctNumeratorOverTotal(wonCount, total);
    const revenue = wonSum._sum.value ?? 0;

    return NextResponse.json({
      total,
      responseRate,
      winRate,
      revenue,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
