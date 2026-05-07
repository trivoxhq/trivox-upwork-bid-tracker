import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function requireAdminApi(): Promise<
  | { ok: true; adminId: string }
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

  if (actor.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 }),
    };
  }

  return { ok: true, adminId: actor.id };
}
