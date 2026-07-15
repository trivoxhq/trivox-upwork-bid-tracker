import type { Role } from "@/generated/prisma-client";
import {
  formatIpLabel,
  shortDeviceId,
  userAgentLabel,
} from "@/lib/activity/user-agent-label";
import { canViewTeamWide } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export type ActivityAttendanceMeta = {
  event: "check_in" | "check_out" | "half_day";
  status: string;
  ip: string | null;
  ipLabel: string | null;
  browser: string | null;
  deviceId: string | null;
  deviceLabel: string | null;
  workDate: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  workingMinutes: number | null;
  breakMinutes: number | null;
  salaryAmount: number | null;
  dayType: string | null;
  /** Minutes since check-in when session is still open (server snapshot). */
  elapsedMinutes: number | null;
};

export type ActivityTimelineItem = {
  id: string;
  kind: "audit" | "note" | "client_history";
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  actorName: string;
  createdAt: string;
  attendance?: ActivityAttendanceMeta | null;
};

type TimelineActor = { id: string; role: Role };

function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000));
}

function attendanceTitle(
  event: ActivityAttendanceMeta["event"],
  recordStatus: string,
): string {
  if (event === "half_day") return "Half day check-out";
  if (event === "check_out") return "Checked out";
  if (recordStatus === "open") return "Checked in · session open";
  return "Checked in";
}

function buildAttendanceMeta(
  summary: string,
  record: {
    status: string;
    checkInAt: Date;
    checkOutAt: Date | null;
    breakMinutes: number;
    workingMinutes: number | null;
    salaryAmount: number | null;
    dayType: string | null;
    workDate: Date;
    checkInIp: string;
    checkInUserAgent: string;
    checkInDeviceId: string | null;
    checkOutIp: string | null;
    checkOutUserAgent: string | null;
    checkOutDeviceId: string | null;
  },
): { summary: string; attendance: ActivityAttendanceMeta } {
  const lower = summary.toLowerCase();
  const isHalf = lower.includes("half day");
  const isOut = isHalf || lower.includes("check out") || lower.startsWith("checkout");
  const event: ActivityAttendanceMeta["event"] = isHalf
    ? "half_day"
    : isOut
      ? "check_out"
      : "check_in";

  const useOut = event !== "check_in";
  const ip = useOut ? (record.checkOutIp ?? record.checkInIp) : record.checkInIp;
  const ua = useOut
    ? (record.checkOutUserAgent ?? record.checkInUserAgent)
    : record.checkInUserAgent;
  const device = useOut
    ? (record.checkOutDeviceId ?? record.checkInDeviceId)
    : record.checkInDeviceId;

  const now = new Date();
  const elapsedMinutes =
    record.status === "open" && event === "check_in"
      ? minutesBetween(record.checkInAt, now)
      : null;

  const attendance: ActivityAttendanceMeta = {
    event,
    status: record.status,
    ip,
    ipLabel: formatIpLabel(ip),
    browser: userAgentLabel(ua),
    deviceId: device,
    deviceLabel: shortDeviceId(device),
    workDate: record.workDate.toISOString().slice(0, 10),
    checkInAt: record.checkInAt.toISOString(),
    checkOutAt: record.checkOutAt?.toISOString() ?? null,
    workingMinutes: record.workingMinutes,
    breakMinutes: record.breakMinutes,
    salaryAmount: record.salaryAmount,
    dayType: record.dayType,
    elapsedMinutes,
  };

  return {
    summary: attendanceTitle(event, record.status),
    attendance,
  };
}

export async function fetchActivityTimeline(
  actor: TimelineActor,
  limit = 50,
): Promise<ActivityTimelineItem[]> {
  const teamWide = canViewTeamWide(actor.role);
  const take = Math.min(Math.max(limit, 1), 100);

  const [auditLogs, notes, history] = await Promise.all([
    prisma.crmAuditLog.findMany({
      where: teamWide ? undefined : { userId: actor.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.crmNote.findMany({
      where: teamWide ? undefined : { createdById: actor.id },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.clientHistory.findMany({
      where: teamWide ? undefined : { createdById: actor.id },
      include: { createdBy: { select: { name: true } } },
      orderBy: { occurredAt: "desc" },
      take,
    }),
  ]);

  const attendanceIds = [
    ...new Set(
      auditLogs
        .filter((row) => row.entityType === "attendance")
        .map((row) => row.entityId),
    ),
  ];

  const attendanceById =
    attendanceIds.length === 0
      ? new Map<string, Awaited<ReturnType<typeof prisma.attendanceRecord.findMany>>[number]>()
      : new Map(
          (
            await prisma.attendanceRecord.findMany({
              where: { id: { in: attendanceIds } },
              select: {
                id: true,
                status: true,
                checkInAt: true,
                checkOutAt: true,
                breakMinutes: true,
                workingMinutes: true,
                salaryAmount: true,
                dayType: true,
                workDate: true,
                checkInIp: true,
                checkInUserAgent: true,
                checkInDeviceId: true,
                checkOutIp: true,
                checkOutUserAgent: true,
                checkOutDeviceId: true,
              },
            })
          ).map((row) => [row.id, row]),
        );

  const items: ActivityTimelineItem[] = [
    ...auditLogs.map((row) => {
      const base = {
        id: row.id,
        kind: "audit" as const,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        summary: row.summary,
        actorName: row.user.name,
        createdAt: row.createdAt.toISOString(),
        attendance: null as ActivityAttendanceMeta | null,
      };

      if (row.entityType !== "attendance") return base;
      const record = attendanceById.get(row.entityId);
      if (!record) return base;

      const enriched = buildAttendanceMeta(row.summary, record);
      return {
        ...base,
        summary: enriched.summary,
        attendance: enriched.attendance,
      };
    }),
    ...notes.map((row) => ({
      id: row.id,
      kind: "note" as const,
      action: "note",
      entityType: row.entityType,
      entityId: row.entityId,
      summary: row.body.length > 120 ? `${row.body.slice(0, 117)}…` : row.body,
      actorName: row.createdBy.name,
      createdAt: row.createdAt.toISOString(),
      attendance: null as ActivityAttendanceMeta | null,
    })),
    ...history.map((row) => ({
      id: row.id,
      kind: "client_history" as const,
      action: row.type,
      entityType: "client",
      entityId: row.clientId,
      summary: row.title,
      actorName: row.createdBy.name,
      createdAt: row.occurredAt.toISOString(),
      attendance: null as ActivityAttendanceMeta | null,
    })),
  ];

  return items
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, take);
}
