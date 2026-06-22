import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isValidLeadStatus } from "@/lib/leads/catalog";
import { LEAD_INCLUDE_USERS, mapLeadToRow } from "@/lib/leads/map-lead";
import { prisma } from "@/lib/prisma";

const UPDATABLE_KEYS = new Set([
  "title",
  "clientName",
  "email",
  "phone",
  "company",
  "country",
  "source",
  "status",
  "notes",
  "assignedToId",
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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) return jsonError(400, "Lead id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const existing = await prisma.lead.findUnique({
      where: { id },
      select: { id: true, assignedToId: true, createdById: true },
    });
    if (!existing) return jsonError(404, "Lead not found.");

    const canAccess =
      actor.role === "admin" ||
      existing.assignedToId === actor.id ||
      existing.createdById === actor.id;
    if (!canAccess) return jsonError(403, "You do not have access to this lead.");

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
    const data: Prisma.LeadUpdateInput = {};

    const title = requiredUpdateString(body.title, "title", errors);
    if (title !== undefined && !errors.title) data.title = title;

    const clientName = requiredUpdateString(body.clientName, "clientName", errors);
    if (clientName !== undefined && !errors.clientName) data.clientName = clientName;

    for (const field of ["email", "phone", "company", "country", "source", "notes"] as const) {
      if (field in body) {
        const value = optionalNullableString(body[field], field, errors);
        if (value !== undefined && !errors[field]) data[field] = value;
      }
    }

    if ("status" in body) {
      const status = requiredUpdateString(body.status, "status", errors);
      if (status && !isValidLeadStatus(status)) {
        errors.status = "status must be one of the configured pipeline stages.";
      } else if (status && !errors.status) {
        data.status = status;
      }
    }

    if ("assignedToId" in body) {
      if (actor.role !== "admin") {
        errors.assignedToId = "Only administrators can reassign leads.";
      } else {
        const assignedToId = optionalNullableString(body.assignedToId, "assignedToId", errors);
        if (assignedToId === null) {
          data.assignedTo = { disconnect: true };
        } else if (assignedToId && !errors.assignedToId) {
          const assignee = await prisma.user.findFirst({
            where: { id: assignedToId, isActive: true },
            select: { id: true },
          });
          if (!assignee) {
            errors.assignedToId = "Choose an active team member.";
          } else {
            data.assignedTo = { connect: { id: assignedToId } };
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) return jsonError(400, "Validation failed.", errors);
    if (Object.keys(data).length === 0) return jsonError(400, "No updates provided.");

    const lead = await prisma.lead.update({
      where: { id },
      data,
      include: LEAD_INCLUDE_USERS,
    });

    return NextResponse.json({ success: true, lead: mapLeadToRow(lead) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError(404, "Lead not found.");
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
    if (!id?.trim()) return jsonError(400, "Lead id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");
    if (actor.role !== "admin") return jsonError(403, "Only administrators can delete leads.");

    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError(404, "Lead not found.");
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
