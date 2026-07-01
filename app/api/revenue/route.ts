import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { computeRevenueSummary } from "@/lib/revenue/compute-revenue";
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

    const summary = await computeRevenueSummary(actor);
    return NextResponse.json({ success: true, summary });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
