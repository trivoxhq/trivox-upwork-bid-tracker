import { NextResponse } from "next/server";
import { requireAttendanceWriteActor, jsonError } from "@/lib/attendance/auth";
import { computeLiveSnapshot } from "@/lib/attendance/compute";
import { getWorkDate } from "@/lib/attendance/get-work-date";
import { assertClientMeta, extractClientMeta } from "@/lib/attendance/request-meta";
import { serializeAttendanceRecord } from "@/lib/attendance/serialize";
import { getOrCreateAttendanceSettings, toRuleSettings } from "@/lib/attendance/settings";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const gate = await requireAttendanceWriteActor();
    if (!gate.ok) return gate.response;

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const meta = extractClientMeta(request, body.deviceFingerprint);
    const metaError = assertClientMeta(meta);
    if (metaError) return jsonError(400, metaError);

    const user = await prisma.user.findUnique({
      where: { id: gate.actor.id },
      select: { id: true, timezone: true },
    });
    if (!user) return jsonError(401, "Unauthorized.");

    const workDate = getWorkDate(new Date(), user.timezone || undefined);
    const record = await prisma.attendanceRecord.findUnique({
      where: { userId_workDate: { userId: user.id, workDate } },
      include: { breaks: true },
    });

    if (!record || record.status !== "open") {
      return jsonError(400, "No open attendance session to start a break.");
    }
    if (record.breaks.some((b) => !b.endedAt)) {
      return jsonError(400, "A break is already in progress.");
    }

    const settings = await getOrCreateAttendanceSettings();
    const rules = toRuleSettings(settings);
    const live = computeLiveSnapshot(
      record.checkInAt,
      record.breakMinutes,
      record.breaks,
      rules,
    );
    if (!live.canStartBreak) {
      const used = live.breakMinutes;
      const allow = settings.breakAllowanceMinutes;
      return jsonError(
        400,
        used >= allow
          ? `Break allowance of ${allow} minutes is fully used. Extra break time is deducted from working hours.`
          : "A break is already in progress.",
      );
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.attendanceBreak.create({
        data: { recordId: record.id, startedAt: now },
      }),
      prisma.attendanceEventLog.create({
        data: {
          recordId: record.id,
          action: "break_start",
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          deviceFingerprint: meta.deviceFingerprint,
        },
      }),
    ]);

    const refreshed = await prisma.attendanceRecord.findUniqueOrThrow({
      where: { id: record.id },
      include: {
        breaks: { orderBy: { startedAt: "asc" } },
        user: { select: { id: true, name: true, email: true, monthlySalary: true } },
      },
    });

    return NextResponse.json({
      success: true,
      record: serializeAttendanceRecord(refreshed, toRuleSettings(settings)),
    });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
