import { Prisma } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readOnlyForbiddenResponse } from "@/lib/auth/api-guards";
import { canAssign, canDelete, canViewTeamWide, canWrite } from "@/lib/auth/roles";
import { isValidCalendarEventType } from "@/lib/calendar/catalog";
import {
  CALENDAR_EVENT_INCLUDE_USERS,
  mapCalendarEventToRow,
} from "@/lib/calendar/map-calendar-event";
import { prisma } from "@/lib/prisma";

const UPDATABLE_KEYS = new Set([
  "title",
  "description",
  "type",
  "startsAt",
  "endsAt",
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

function parseUpdateDate(value: unknown, field: string, errors: Record<string, string>) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    errors[field] = `${field} must be a non-empty date string.`;
    return undefined;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    errors[field] = `${field} must be a valid date.`;
    return undefined;
  }
  return d;
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
    if (!id?.trim()) return jsonError(400, "Calendar event id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const existing = await prisma.calendarEvent.findUnique({
      where: { id },
      select: { id: true, ownerId: true, createdById: true, startsAt: true, endsAt: true },
    });
    if (!existing) return jsonError(404, "Calendar event not found.");

    const canAccess =
      canViewTeamWide(actor.role) ||
      existing.ownerId === actor.id ||
      existing.createdById === actor.id;
    if (!canAccess) return jsonError(403, "You do not have access to this event.");

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
    const data: Prisma.CalendarEventUpdateInput = {};

    const title = requiredUpdateString(body.title, "title", errors);
    if (title !== undefined && !errors.title) data.title = title;

    if ("description" in body) {
      const description = optionalNullableString(body.description, "description", errors);
      if (description !== undefined && !errors.description) data.description = description;
    }

    if ("type" in body) {
      const type = requiredUpdateString(body.type, "type", errors);
      if (type && !isValidCalendarEventType(type)) {
        errors.type = "type must be one of the configured calendar event types.";
      } else if (type && !errors.type) {
        data.type = type;
      }
    }

    const startsAt = parseUpdateDate(body.startsAt, "startsAt", errors);
    if (startsAt !== undefined && !errors.startsAt) data.startsAt = startsAt;

    const endsAt = parseOptionalUpdateDate(body.endsAt, "endsAt", errors);
    if (endsAt !== undefined && !errors.endsAt) data.endsAt = endsAt;

    const finalStartsAt = startsAt ?? existing.startsAt;
    const finalEndsAt = endsAt === undefined ? existing.endsAt : endsAt;
    if (finalEndsAt && finalEndsAt.getTime() < finalStartsAt.getTime()) {
      errors.endsAt = "endsAt must be after startsAt.";
    }

    if ("ownerId" in body) {
      if (!canAssign(actor.role)) {
        errors.ownerId = "Only administrators and managers can reassign events.";
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

    const event = await prisma.calendarEvent.update({
      where: { id },
      data,
      include: CALENDAR_EVENT_INCLUDE_USERS,
    });

    return NextResponse.json({ success: true, event: mapCalendarEventToRow(event) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError(404, "Calendar event not found.");
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
    if (!id?.trim()) return jsonError(400, "Calendar event id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");
    if (!canDelete(actor.role)) return jsonError(403, "Only administrators and managers can delete events.");

    await prisma.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError(404, "Calendar event not found.");
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
