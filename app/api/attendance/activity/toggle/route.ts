import { NextResponse } from "next/server";
import { jsonError, requireAttendanceActor } from "@/lib/attendance/auth";
import { canManageSettings } from "@/lib/auth/roles";
import {
  attendanceAdminKeyConfigured,
  getOrCreateAttendanceSettings,
  verifyAttendanceAdminKey,
} from "@/lib/attendance/settings";
import { ATTENDANCE_SETTINGS_ID } from "@/lib/attendance/constants";
import { logCrmAudit } from "@/lib/audit/log-crm-audit";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const gate = await requireAttendanceActor();
    if (!gate.ok) return gate.response;

    if (!canManageSettings(gate.actor.role)) {
      return jsonError(403, "Only administrators can toggle activity tracking.");
    }
    if (!attendanceAdminKeyConfigured()) {
      return jsonError(400, "ATTENDANCE_ADMIN_KEY is not configured on the server.");
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    if (!verifyAttendanceAdminKey(body.adminKey)) {
      return jsonError(403, "Invalid attendance admin key.");
    }

    const current = await getOrCreateAttendanceSettings();
    const enabled =
      typeof body.enabled === "boolean" ? body.enabled : !current.activityTrackingEnabled;

    const updated = await prisma.attendanceSettings.update({
      where: { id: ATTENDANCE_SETTINGS_ID },
      data: {
        activityTrackingEnabled: enabled,
        updatedById: gate.actor.id,
      },
    });

    void logCrmAudit({
      userId: gate.actor.id,
      action: "updated",
      entityType: "attendance_settings",
      entityId: updated.id,
      summary: `Activity tracking ${enabled ? "enabled" : "disabled"}`,
    });

    return NextResponse.json({
      success: true,
      activityTrackingEnabled: updated.activityTrackingEnabled,
    });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
