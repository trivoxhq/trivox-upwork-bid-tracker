import { NextResponse } from "next/server";
import { requireAttendanceActor, jsonError } from "@/lib/attendance/auth";
import { getWorkDate } from "@/lib/attendance/get-work-date";
import { serializeAttendanceRecord } from "@/lib/attendance/serialize";
import { getOrCreateAttendanceSettings, toRuleSettings } from "@/lib/attendance/settings";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const gate = await requireAttendanceActor();
    if (!gate.ok) return gate.response;

    const [settings, user] = await Promise.all([
      getOrCreateAttendanceSettings(),
      prisma.user.findUnique({
        where: { id: gate.actor.id },
        select: { id: true, name: true, email: true, monthlySalary: true, timezone: true },
      }),
    ]);

    if (!user) return jsonError(401, "Unauthorized.");

    const workDate = getWorkDate(new Date(), user.timezone || undefined);
    const record = await prisma.attendanceRecord.findUnique({
      where: { userId_workDate: { userId: gate.actor.id, workDate } },
      include: {
        breaks: { orderBy: { startedAt: "asc" } },
        user: { select: { id: true, name: true, email: true, monthlySalary: true } },
      },
    });

    return NextResponse.json({
      success: true,
      settings: {
        ...toRuleSettings(settings),
        activityTrackingEnabled: settings.activityTrackingEnabled,
      },
      record: record ? serializeAttendanceRecord(record, toRuleSettings(settings)) : null,
    });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
