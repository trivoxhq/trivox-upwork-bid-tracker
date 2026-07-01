import type { Role } from "@/generated/prisma-client";
import { canViewTeamWide } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export type ActivityTimelineItem = {
  id: string;
  kind: "audit" | "note" | "client_history";
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  actorName: string;
  createdAt: string;
};

type TimelineActor = { id: string; role: Role };

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

  const items: ActivityTimelineItem[] = [
    ...auditLogs.map((row) => ({
      id: row.id,
      kind: "audit" as const,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      summary: row.summary,
      actorName: row.user.name,
      createdAt: row.createdAt.toISOString(),
    })),
    ...notes.map((row) => ({
      id: row.id,
      kind: "note" as const,
      action: "note",
      entityType: row.entityType,
      entityId: row.entityId,
      summary: row.body.length > 120 ? `${row.body.slice(0, 117)}…` : row.body,
      actorName: row.createdBy.name,
      createdAt: row.createdAt.toISOString(),
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
    })),
  ];

  return items
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, take);
}
