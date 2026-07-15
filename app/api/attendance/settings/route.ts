import { NextResponse } from "next/server";
import { jsonError, requireAttendanceActor } from "@/lib/attendance/auth";
import { canManageSettings } from "@/lib/auth/roles";
import {
  attendanceAdminKeyConfigured,
  getOrCreateAttendanceSettings,
  toRuleSettings,
  verifyAttendanceAdminKey,
} from "@/lib/attendance/settings";
import { logCrmAudit } from "@/lib/audit/log-crm-audit";
import { prisma } from "@/lib/prisma";
import { ATTENDANCE_SETTINGS_ID } from "@/lib/attendance/constants";

function parsePositiveInt(value: unknown, field: string, errors: Record<string, string>): number | null {
  if (value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    errors[field] = `${field} must be a positive whole number.`;
    return null;
  }
  return n;
}

export async function GET() {
  try {
    const gate = await requireAttendanceActor();
    if (!gate.ok) return gate.response;

    const settings = await getOrCreateAttendanceSettings();
    return NextResponse.json({
      success: true,
      settings: {
        ...toRuleSettings(settings),
        activityTrackingEnabled: settings.activityTrackingEnabled,
        keyConfigured: attendanceAdminKeyConfigured(),
        canEdit: canManageSettings(gate.actor.role) && attendanceAdminKeyConfigured(),
      },
    });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}

export async function PUT(request: Request) {
  try {
    const gate = await requireAttendanceActor();
    if (!gate.ok) return gate.response;

    if (!canManageSettings(gate.actor.role)) {
      return jsonError(403, "Only administrators can change attendance settings.");
    }
    if (!attendanceAdminKeyConfigured()) {
      return jsonError(
        400,
        "ATTENDANCE_ADMIN_KEY is not configured on the server. Settings cannot be changed.",
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    if (!verifyAttendanceAdminKey(body.adminKey)) {
      return jsonError(403, "Invalid attendance admin key. Admin login alone is not enough.");
    }

    const errors: Record<string, string> = {};
    const shiftTotalMinutes = parsePositiveInt(body.shiftTotalMinutes, "shiftTotalMinutes", errors);
    const breakAllowanceMinutes = parsePositiveInt(
      body.breakAllowanceMinutes,
      "breakAllowanceMinutes",
      errors,
    );
    const minFullDayWorkingMinutes = parsePositiveInt(
      body.minFullDayWorkingMinutes,
      "minFullDayWorkingMinutes",
      errors,
    );
    const minHalfDayWorkingMinutes = parsePositiveInt(
      body.minHalfDayWorkingMinutes,
      "minHalfDayWorkingMinutes",
      errors,
    );
    const workingDaysPerMonth = parsePositiveInt(
      body.workingDaysPerMonth,
      "workingDaysPerMonth",
      errors,
    );

    if (Object.keys(errors).length > 0) {
      return jsonError(400, "Validation failed.", { errors });
    }

    if (
      minHalfDayWorkingMinutes! >= minFullDayWorkingMinutes! ||
      minFullDayWorkingMinutes! > shiftTotalMinutes!
    ) {
      return jsonError(
        400,
        "Require: half-day min < full-day min, and full-day min ≤ shift total.",
      );
    }

    await getOrCreateAttendanceSettings();
    const updated = await prisma.attendanceSettings.update({
      where: { id: ATTENDANCE_SETTINGS_ID },
      data: {
        shiftTotalMinutes: shiftTotalMinutes!,
        breakAllowanceMinutes: breakAllowanceMinutes!,
        minFullDayWorkingMinutes: minFullDayWorkingMinutes!,
        minHalfDayWorkingMinutes: minHalfDayWorkingMinutes!,
        workingDaysPerMonth: workingDaysPerMonth!,
        updatedById: gate.actor.id,
      },
    });

    void logCrmAudit({
      userId: gate.actor.id,
      action: "updated",
      entityType: "attendance_settings",
      entityId: updated.id,
      summary: "Updated attendance shift rules with admin key",
    });

    return NextResponse.json({
      success: true,
      settings: {
        ...toRuleSettings(updated),
        activityTrackingEnabled: updated.activityTrackingEnabled,
        keyConfigured: true,
        canEdit: true,
      },
    });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
