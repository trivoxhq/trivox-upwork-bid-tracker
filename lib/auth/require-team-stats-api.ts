import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canViewTeamStats } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export async function requireTeamStatsApi(): Promise<
  | { ok: true; actorId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getCurrentUser();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 }),
    };
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, isActive: true, role: true },
  });

  if (!actor?.isActive) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 }),
    };
  }

  if (!canViewTeamStats(actor.role)) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 }),
    };
  }

  return { ok: true, actorId: actor.id };
}
