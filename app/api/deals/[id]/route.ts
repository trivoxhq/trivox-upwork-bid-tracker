import { Prisma } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readOnlyForbiddenResponse } from "@/lib/auth/api-guards";
import { canAssign, canDelete, canViewTeamWide, canWrite } from "@/lib/auth/roles";
import { isValidDealStage, isValidProbability } from "@/lib/deals/catalog";
import { dealCloseDatePatch } from "@/lib/deals/close-dates";
import { resolveLostReasonForDeal } from "@/lib/lost-reasons/normalize";
import { logCrmAudit } from "@/lib/audit/log-crm-audit";
import { DEAL_INCLUDE_USERS, mapDealToRow } from "@/lib/deals/map-deal";
import { prisma } from "@/lib/prisma";

const UPDATABLE_KEYS = new Set([
  "title",
  "clientName",
  "value",
  "stage",
  "lostReason",
  "probability",
  "expectedCloseAt",
  "notes",
  "ownerId",
]);

function jsonError(status: number, message: string, errors?: Record<string, string>) {
  return NextResponse.json(
    errors ? { success: false, message, errors } : { success: false, message },
    { status },
  );
}

async function getActiveActor() {
  const session = await getCurrentUser();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, role: true, isActive: true },
  });
}

function requiredUpdateString(
  value: unknown,
  field: string,
  errors: Record<string, string>,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    errors[field] = `${field} must be a non-empty string.`;
    return undefined;
  }
  return value.trim();
}

function optionalNullableString(
  value: unknown,
  field: string,
  errors: Record<string, string>,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    errors[field] = `${field} must be a string or null.`;
    return undefined;
  }
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function parseUpdateValue(value: unknown, errors: Record<string, string>) {
  if (value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    errors.value = "value must be a non-negative whole number.";
    return undefined;
  }
  return n;
}

function parseUpdateProbability(value: unknown, errors: Record<string, string>) {
  if (value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || !isValidProbability(n)) {
    errors.probability = "probability must be an integer from 0 to 100.";
    return undefined;
  }
  return n;
}

function parseOptionalUpdateDate(value: unknown, field: string, errors: Record<string, string>) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    errors[field] = `${field} must be a date string or null.`;
    return undefined;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    errors[field] = `${field} must be a valid date.`;
    return undefined;
  }
  return d;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) return jsonError(400, "Deal id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const existing = await prisma.deal.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        createdById: true,
        stage: true,
        title: true,
        closedWonAt: true,
        closedLostAt: true,
      },
    });
    if (!existing) return jsonError(404, "Deal not found.");

    const canAccess =
      canViewTeamWide(actor.role) ||
      existing.ownerId === actor.id ||
      existing.createdById === actor.id;
    if (!canAccess) return jsonError(403, "You do not have access to this deal.");

    if (!canWrite(actor.role)) return readOnlyForbiddenResponse();

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return jsonError(400, "Body must be a JSON object.");
    }

    const unknownKeys = Object.keys(body).filter((key) => !UPDATABLE_KEYS.has(key));
    if (unknownKeys.length > 0) {
      return jsonError(400, `Unknown fields: ${unknownKeys.join(", ")}.`);
    }

    const errors: Record<string, string> = {};
    const data: Prisma.DealUpdateInput = {};

    const title = requiredUpdateString(body.title, "title", errors);
    if (title !== undefined && !errors.title) data.title = title;

    const clientName = requiredUpdateString(body.clientName, "clientName", errors);
    if (clientName !== undefined && !errors.clientName) data.clientName = clientName;

    const value = parseUpdateValue(body.value, errors);
    if (value !== undefined && !errors.value) data.value = value;

    const probability = parseUpdateProbability(body.probability, errors);
    if (probability !== undefined && !errors.probability) data.probability = probability;

    if ("notes" in body) {
      const notes = optionalNullableString(body.notes, "notes", errors);
      if (notes !== undefined && !errors.notes) data.notes = notes;
    }

    if ("stage" in body) {
      const stage = requiredUpdateString(body.stage, "stage", errors);
      if (stage && !isValidDealStage(stage)) {
        errors.stage = "stage must be one of the configured deal stages.";
      } else if (stage && !errors.stage) {
        data.stage = stage;
        Object.assign(data, dealCloseDatePatch(existing, stage));
      }
    }

    const nextStage = (data.stage as string | undefined) ?? existing.stage;
    if ("lostReason" in body || "stage" in body) {
      const lostReason = resolveLostReasonForDeal(
        nextStage,
        body.lostReason as string | null | undefined,
        errors,
      );
      if (lostReason !== undefined && !errors.lostReason) {
        data.lostReason = lostReason;
      }
    }

    const expectedCloseAt = parseOptionalUpdateDate(
      body.expectedCloseAt,
      "expectedCloseAt",
      errors,
    );
    if (expectedCloseAt !== undefined && !errors.expectedCloseAt) {
      data.expectedCloseAt = expectedCloseAt;
    }

    if ("ownerId" in body) {
      if (!canAssign(actor.role)) {
        errors.ownerId = "Only administrators and managers can reassign deals.";
      } else {
        const ownerId = optionalNullableString(body.ownerId, "ownerId", errors);
        if (ownerId === null) {
          data.owner = { disconnect: true };
        } else if (ownerId && !errors.ownerId) {
          const owner = await prisma.user.findFirst({
            where: { id: ownerId, isActive: true },
            select: { id: true },
          });
          if (!owner) {
            errors.ownerId = "Choose an active owner.";
          } else {
            data.owner = { connect: { id: ownerId } };
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) return jsonError(400, "Validation failed.", errors);
    if (Object.keys(data).length === 0) return jsonError(400, "No updates provided.");

    const deal = await prisma.deal.update({
      where: { id },
      data,
      include: DEAL_INCLUDE_USERS,
    });

    void logCrmAudit({
      userId: actor.id,
      action: "updated",
      entityType: "deal",
      entityId: deal.id,
      summary: `Updated deal "${deal.title}"`,
    });

    return NextResponse.json({ success: true, deal: mapDealToRow(deal) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError(404, "Deal not found.");
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) return jsonError(400, "Deal id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");
    if (!canDelete(actor.role)) return jsonError(403, "Only administrators and managers can delete deals.");

    await prisma.deal.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError(404, "Deal not found.");
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
