import type { Role } from "@/generated/prisma-client";
import { canDelete, canViewTeamWide, canWrite } from "@/lib/auth/roles";
import type { CrmEntityType } from "@/lib/notes/constants";
import { isValidCrmEntityType } from "@/lib/notes/constants";
import { prisma } from "@/lib/prisma";

export type EntityAccessResult =
  | { ok: true; entityType: CrmEntityType; entityId: string }
  | { ok: false; status: number; message: string };

async function canReadLead(actor: { id: string; role: Role }, entityId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: entityId },
    select: { assignedToId: true, createdById: true },
  });
  if (!lead) return { found: false as const };
  const allowed =
    canViewTeamWide(actor.role) ||
    lead.assignedToId === actor.id ||
    lead.createdById === actor.id;
  return { found: true as const, allowed };
}

async function canReadDeal(actor: { id: string; role: Role }, entityId: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: entityId },
    select: { ownerId: true, createdById: true },
  });
  if (!deal) return { found: false as const };
  const allowed =
    canViewTeamWide(actor.role) ||
    deal.ownerId === actor.id ||
    deal.createdById === actor.id;
  return { found: true as const, allowed };
}

async function canReadTask(actor: { id: string; role: Role }, entityId: string) {
  const task = await prisma.crmTask.findUnique({
    where: { id: entityId },
    select: { assignedToId: true, createdById: true },
  });
  if (!task) return { found: false as const };
  const allowed =
    canViewTeamWide(actor.role) ||
    task.assignedToId === actor.id ||
    task.createdById === actor.id;
  return { found: true as const, allowed };
}

async function canReadBid(actor: { id: string; role: Role }, entityId: string) {
  const bid = await prisma.bid.findUnique({
    where: { id: entityId },
    select: { addedById: true },
  });
  if (!bid) return { found: false as const };
  const allowed = canViewTeamWide(actor.role) || bid.addedById === actor.id;
  return { found: true as const, allowed };
}

async function canReadClient(_actor: { id: string; role: Role }, entityId: string) {
  const client = await prisma.client.findUnique({
    where: { id: entityId },
    select: { id: true },
  });
  if (!client) return { found: false as const };
  return { found: true as const, allowed: true };
}

export async function assertEntityNoteAccess(
  actor: { id: string; role: Role; isActive: boolean },
  entityTypeRaw: string,
  entityIdRaw: string,
  mode: "read" | "write",
): Promise<EntityAccessResult> {
  if (!actor.isActive) {
    return { ok: false, status: 401, message: "Unauthorized." };
  }

  const entityType = entityTypeRaw.trim().toLowerCase();
  const entityId = entityIdRaw.trim();
  if (!isValidCrmEntityType(entityType) || !entityId) {
    return { ok: false, status: 400, message: "Invalid entity type or id." };
  }

  if (mode === "write" && !canWrite(actor.role)) {
    return { ok: false, status: 403, message: "Read-only access." };
  }

  let access: { found: boolean; allowed?: boolean };
  switch (entityType) {
    case "lead":
      access = await canReadLead(actor, entityId);
      break;
    case "deal":
      access = await canReadDeal(actor, entityId);
      break;
    case "task":
      access = await canReadTask(actor, entityId);
      break;
    case "bid":
      access = await canReadBid(actor, entityId);
      break;
    case "client":
      access = await canReadClient(actor, entityId);
      break;
    default:
      return { ok: false, status: 400, message: "Invalid entity type." };
  }

  if (!access.found) {
    const label = entityType.charAt(0).toUpperCase() + entityType.slice(1);
    return { ok: false, status: 404, message: `${label} not found.` };
  }
  if (!access.allowed) {
    return { ok: false, status: 403, message: "You do not have access to this record." };
  }

  return { ok: true, entityType, entityId };
}

export function canDeleteNote(
  actor: { id: string; role: Role },
  note: { createdById: string },
): boolean {
  return note.createdById === actor.id || canDelete(actor.role);
}

export function canDeleteAttachment(
  actor: { id: string; role: Role },
  attachment: { createdById: string },
): boolean {
  return attachment.createdById === actor.id || canDelete(actor.role);
}
