import { Prisma } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readOnlyForbiddenResponse } from "@/lib/auth/api-guards";
import { canWrite } from "@/lib/auth/roles";
import { isValidClientHistoryType } from "@/lib/clients/catalog";
import { mapClientHistoryToRow } from "@/lib/clients/map-client";
import { prisma } from "@/lib/prisma";

type CreateHistoryBody = {
  type?: unknown;
  title?: unknown;
  description?: unknown;
  occurredAt?: unknown;
};

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
    select: { id: true, isActive: true, role: true },
  });
}

function requiredString(value: unknown, field: string, errors: Record<string, string>) {
  if (typeof value !== "string" || !value.trim()) {
    errors[field] = `${field} is required.`;
    return null;
  }
  return value.trim();
}

function optionalString(value: unknown, field: string, errors: Record<string, string>) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    errors[field] = `${field} must be a string.`;
    return null;
  }
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function parseOccurredAt(value: unknown, errors: Record<string, string>) {
  if (value === undefined || value === null || value === "") return new Date();
  if (typeof value !== "string") {
    errors.occurredAt = "occurredAt must be a date string.";
    return new Date();
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    errors.occurredAt = "occurredAt must be a valid date.";
    return new Date();
  }
  return d;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) return jsonError(400, "Client id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");
    if (!canWrite(actor.role)) return readOnlyForbiddenResponse();

    const client = await prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!client) return jsonError(404, "Client not found.");

    let body: CreateHistoryBody;
    try {
      body = (await request.json()) as CreateHistoryBody;
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    const errors: Record<string, string> = {};
    const title = requiredString(body.title, "title", errors);
    const type = typeof body.type === "string" && body.type.trim() ? body.type.trim() : "Note";
    if (!isValidClientHistoryType(type)) {
      errors.type = "type must be one of the configured history types.";
    }
    const description = optionalString(body.description, "description", errors);
    const occurredAt = parseOccurredAt(body.occurredAt, errors);

    if (Object.keys(errors).length > 0) return jsonError(400, "Validation failed.", errors);

    const history = await prisma.clientHistory.create({
      data: {
        clientId: client.id,
        type,
        title: title!,
        description,
        occurredAt,
        createdById: actor.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(
      { success: true, history: mapClientHistoryToRow(history) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return jsonError(400, "Invalid client or user relation.");
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
