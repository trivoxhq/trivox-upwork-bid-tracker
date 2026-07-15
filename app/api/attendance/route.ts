import { NextResponse } from "next/server";
import { canViewTeamAttendance, jsonError, requireAttendanceActor } from "@/lib/attendance/auth";
import { serializeAttendanceRecord } from "@/lib/attendance/serialize";
import { getOrCreateAttendanceSettings, toRuleSettings } from "@/lib/attendance/settings";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const gate = await requireAttendanceActor();
    if (!gate.ok) return gate.response;

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId")?.trim();
    const from = url.searchParams.get("from")?.trim();
    const to = url.searchParams.get("to")?.trim();
    const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

    const teamWide = canViewTeamAttendance(gate.actor.role);
    if (userId && userId !== gate.actor.id && !teamWide) {
      return jsonError(403, "Forbidden.");
    }

    const where: {
      userId?: string;
      workDate?: { gte?: Date; lte?: Date };
    } = {};

    if (userId) where.userId = userId;
    else if (!teamWide) where.userId = gate.actor.id;

    if (from || to) {
      where.workDate = {};
      if (from) where.workDate.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) where.workDate.lte = new Date(`${to}T00:00:00.000Z`);
    }

    const settings = await getOrCreateAttendanceSettings();
    const rules = toRuleSettings(settings);

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        breaks: { orderBy: { startedAt: "asc" } },
        user: { select: { id: true, name: true, email: true, monthlySalary: true } },
      },
      orderBy: [{ workDate: "desc" }, { checkInAt: "desc" }],
      take: limit,
    });

    return NextResponse.json({
      success: true,
      records: records.map((r) => serializeAttendanceRecord(r, rules)),
    });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
