import { prisma } from "@/lib/prisma";

export type CrmAuditAction = "created" | "updated" | "deleted";

export async function logCrmAudit(params: {
  userId: string;
  action: CrmAuditAction;
  entityType: string;
  entityId: string;
  summary: string;
}): Promise<void> {
  try {
    await prisma.crmAuditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        summary: params.summary,
      },
    });
  } catch {
    /* audit logging must not block CRM writes */
  }
}
