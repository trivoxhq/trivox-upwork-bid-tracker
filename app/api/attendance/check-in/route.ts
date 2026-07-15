import { NextResponse } from "next/server";
import { requireAttendanceWriteActor, jsonError } from "@/lib/attendance/auth";
import { getWorkDate } from "@/lib/attendance/get-work-date";
import { assertClientMeta, extractClientMeta } from "@/lib/attendance/request-meta";
import { serializeAttendanceRecord } from "@/lib/attendance/serialize";
import { getOrCreateAttendanceSettings, toRuleSettings } from "@/lib/attendance/settings";
import { logCrmAudit } from "@/lib/audit/log-crm-audit";
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
      select: { id: true, name: true, email: true, monthlySalary: true, timezone: true },
    });
    if (!user) return jsonError(401, "Unauthorized.");

    const now = new Date();
    const workDate = getWorkDate(now, user.timezone || undefined);

    const existing = await prisma.attendanceRecord.findUnique({
      where: { userId_workDate: { userId: user.id, workDate } },
    });
    if (existing?.status === "open") {
      return jsonError(400, "You already have an open attendance session today.");
    }
    if (existing?.status === "completed") {
      return jsonError(400, "Attendance for today is already completed.");
    }

    const settings = await getOrCreateAttendanceSettings();

    const record = await prisma.attendanceRecord.create({
      data: {
        userId: user.id,
        workDate,
        checkInAt: now,
        status: "open",
        checkInIp: meta.ipAddress,
        checkInUserAgent: meta.userAgent,
        checkInDeviceId: meta.deviceFingerprint,
        eventLogs: {
          create: {
            action: "check_in",
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
            deviceFingerprint: meta.deviceFingerprint,
          },
        },
      },
      include: {
        breaks: true,
        user: { select: { id: true, name: true, email: true, monthlySalary: true } },
      },
    });

    void logCrmAudit({
      userId: user.id,
      action: "created",
      entityType: "attendance",
      entityId: record.id,
      summary: "Checked in",
    });

    return NextResponse.json(
      {
        success: true,
        record: serializeAttendanceRecord(record, toRuleSettings(settings)),
      },
      { status: 201 },
    );
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
