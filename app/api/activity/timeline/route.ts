import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { fetchActivityTimeline } from "@/lib/activity/fetch-timeline";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
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

    const limitRaw = new URL(request.url).searchParams.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 50;

    const items = await fetchActivityTimeline(actor, Number.isFinite(limit) ? limit : 50);
    return NextResponse.json({ success: true, items });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
