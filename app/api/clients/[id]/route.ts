import { Prisma } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { CLIENT_INCLUDE_HISTORY, mapClientToRow } from "@/lib/clients/map-client";
import { prisma } from "@/lib/prisma";

const UPDATABLE_KEYS = new Set([
  "name",
  "email",
  "phone",
  "company",
  "country",
  "source",
  "notes",
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
    select: { id: true, isActive: true, role: true },
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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) return jsonError(400, "Client id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

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
    const data: Prisma.ClientUpdateInput = {};

    const name = requiredUpdateString(body.name, "name", errors);
    if (name !== undefined && !errors.name) data.name = name;

    for (const field of ["email", "phone", "company", "country", "source", "notes"] as const) {
      if (field in body) {
        const value = optionalNullableString(body[field], field, errors);
        if (value !== undefined && !errors[field]) data[field] = value;
      }
    }

    if (Object.keys(errors).length > 0) return jsonError(400, "Validation failed.", errors);
    if (Object.keys(data).length === 0) return jsonError(400, "No updates provided.");

    const client = await prisma.client.update({
      where: { id },
      data,
      include: CLIENT_INCLUDE_HISTORY,
    });

    return NextResponse.json({ success: true, client: mapClientToRow(client) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError(404, "Client not found.");
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
    if (!id?.trim()) return jsonError(400, "Client id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");
    if (actor.role !== "admin") return jsonError(403, "Only administrators can delete clients.");

    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError(404, "Client not found.");
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
