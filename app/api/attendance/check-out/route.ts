import { NextResponse } from "next/server";
import { requireAttendanceWriteActor, jsonError } from "@/lib/attendance/auth";
import { validateCheckout } from "@/lib/attendance/compute";
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

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    const meta = extractClientMeta(request, body.deviceFingerprint);
    const metaError = assertClientMeta(meta);
    if (metaError) return jsonError(400, metaError);

    const summary = typeof body.dailySummary === "string" ? body.dailySummary : "";

    const user = await prisma.user.findUnique({
      where: { id: gate.actor.id },
      select: { id: true, timezone: true, monthlySalary: true },
    });
    if (!user) return jsonError(401, "Unauthorized.");

    const workDate = getWorkDate(new Date(), user.timezone || undefined);
    const record = await prisma.attendanceRecord.findUnique({
      where: { userId_workDate: { userId: user.id, workDate } },
      include: { breaks: true },
    });

    if (!record || record.status !== "open") {
      return jsonError(400, "No open attendance session to check out.");
    }

    const settingsRow = await getOrCreateAttendanceSettings();
    const settings = toRuleSettings(settingsRow);
    const now = new Date();

    const validated = validateCheckout({
      checkInAt: record.checkInAt,
      closedBreakMinutes: record.breakMinutes,
      breaks: record.breaks,
      settings,
      summary,
      monthlySalary: user.monthlySalary,
      now,
    });

    if (!validated.ok) {
      return jsonError(400, validated.message);
    }

    const openBreak = record.breaks.find((b) => !b.endedAt);
    await prisma.$transaction(async (tx) => {
      if (openBreak) {
        await tx.attendanceBreak.update({
          where: { id: openBreak.id },
          data: { endedAt: now },
        });
      }

      await tx.attendanceRecord.update({
        where: { id: record.id },
        data: {
          checkOutAt: now,
          breakMinutes: validated.breakMinutes,
          workingMinutes: validated.workingMinutes,
          salaryAmount: validated.salaryAmount,
          dailySummary: summary.trim(),
          dayType: validated.dayType,
          status: "completed",
          checkOutIp: meta.ipAddress,
          checkOutUserAgent: meta.userAgent,
          checkOutDeviceId: meta.deviceFingerprint,
        },
      });

      await tx.attendanceEventLog.create({
        data: {
          recordId: record.id,
          action: validated.dayType === "half_day" ? "half_day" : "check_out",
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          deviceFingerprint: meta.deviceFingerprint,
        },
      });
    });

    const refreshed = await prisma.attendanceRecord.findUniqueOrThrow({
      where: { id: record.id },
      include: {
        breaks: { orderBy: { startedAt: "asc" } },
        user: { select: { id: true, name: true, email: true, monthlySalary: true } },
      },
    });

    void logCrmAudit({
      userId: user.id,
      action: "updated",
      entityType: "attendance",
      entityId: record.id,
      summary: `${validated.dayType === "half_day" ? "Half day" : "Check out"} — ${validated.workingMinutes}m work · pay ${validated.salaryAmount}`,
    });

    return NextResponse.json({
      success: true,
      record: serializeAttendanceRecord(refreshed, settings),
    });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
