import { NextResponse } from "next/server";
import { getActiveActor } from "@/lib/auth/get-active-actor";
import { canTrackAttendance, canViewTeamWide } from "@/lib/auth/roles";

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

export async function requireAttendanceActor() {
  const actor = await getActiveActor();
  if (!actor?.isActive) {
    return { ok: false as const, response: jsonError(401, "Unauthorized.") };
  }
  return { ok: true as const, actor };
}

export async function requireAttendanceWriteActor() {
  const gate = await requireAttendanceActor();
  if (!gate.ok) return gate;
  if (!canTrackAttendance(gate.actor.role)) {
    return {
      ok: false as const,
      response: jsonError(
        403,
        gate.actor.role === "admin"
          ? "Administrators are exempt from check-in. Use team attendance to review others."
          : "You do not have permission to track attendance.",
      ),
    };
  }
  return gate;
}

export function canViewTeamAttendance(role: Parameters<typeof canViewTeamWide>[0]) {
  return canViewTeamWide(role);
}
