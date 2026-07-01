import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewTeamWide } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, role: true, isActive: true },
    });

    if (!actor?.isActive) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    if (!canViewTeamWide(actor.role)) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const deals = await prisma.deal.findMany({
      where: { NOT: { stage: { in: ["Closed Won", "Closed Lost"] } } },
      select: { id: true, title: true, clientName: true, stage: true, value: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    });

    return NextResponse.json({ success: true, deals });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
