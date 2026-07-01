import { Prisma } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readOnlyForbiddenResponse } from "@/lib/auth/api-guards";
import { canAssign, canViewTeamWide, canWrite } from "@/lib/auth/roles";
import { isValidCalendarEventType } from "@/lib/calendar/catalog";
import {
  CALENDAR_EVENT_INCLUDE_USERS,
  mapCalendarEventToRow,
} from "@/lib/calendar/map-calendar-event";
import { prisma } from "@/lib/prisma";

type CreateCalendarEventBody = {
  title?: unknown;
  description?: unknown;
  type?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  ownerId?: unknown;
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

function parseDate(value: unknown, field: string, errors: Record<string, string>) {
  if (typeof value !== "string" || !value.trim()) {
    errors[field] = `${field} is required.`;
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    errors[field] = `${field} must be a valid date.`;
    return null;
  }
  return d;
}

function parseOptionalDate(value: unknown, field: string, errors: Record<string, string>) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    errors[field] = `${field} must be a date string or null.`;
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    errors[field] = `${field} must be a valid date.`;
    return null;
  }
  return d;
}

export async function GET(request: Request) {
  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const errors: Record<string, string> = {};
    const fromDate = from ? parseOptionalDate(from, "from", errors) : null;
    const toDate = to ? parseOptionalDate(to, "to", errors) : null;
    if (Object.keys(errors).length > 0) return jsonError(400, "Validation failed.", errors);

    const events = await prisma.calendarEvent.findMany({
      where: {
        ...(canViewTeamWide(actor.role)
          ? {}
          : {
              OR: [{ ownerId: actor.id }, { createdById: actor.id }],
            }),
        ...(fromDate || toDate
          ? {
              startsAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      },
      include: CALENDAR_EVENT_INCLUDE_USERS,
      orderBy: [{ startsAt: "asc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ success: true, events: events.map(mapCalendarEventToRow) });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    if (!canWrite(actor.role)) return readOnlyForbiddenResponse();

    let body: CreateCalendarEventBody;
    try {
      body = (await request.json()) as CreateCalendarEventBody;
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    const errors: Record<string, string> = {};
    const title = requiredString(body.title, "title", errors);
    const description = optionalString(body.description, "description", errors);
    const startsAt = parseDate(body.startsAt, "startsAt", errors);
    const endsAt = parseOptionalDate(body.endsAt, "endsAt", errors);
    const type = typeof body.type === "string" && body.type.trim() ? body.type.trim() : "Meeting";

    if (!isValidCalendarEventType(type)) {
      errors.type = "type must be one of the configured calendar event types.";
    }
    if (startsAt && endsAt && endsAt.getTime() < startsAt.getTime()) {
      errors.endsAt = "endsAt must be after startsAt.";
    }

    let ownerId = actor.id;
    if (canAssign(actor.role)) {
      ownerId = optionalString(body.ownerId, "ownerId", errors) ?? actor.id;
    }

    const owner = await prisma.user.findFirst({
      where: { id: ownerId, isActive: true },
      select: { id: true },
    });
    if (!owner) errors.ownerId = "Choose an active owner.";

    if (Object.keys(errors).length > 0) return jsonError(400, "Validation failed.", errors);

    const event = await prisma.calendarEvent.create({
      data: {
        title: title!,
        description,
        type,
        startsAt: startsAt!,
        endsAt,
        ownerId,
        createdById: actor.id,
      },
      include: CALENDAR_EVENT_INCLUDE_USERS,
    });

    return NextResponse.json({ success: true, event: mapCalendarEventToRow(event) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return jsonError(400, "Invalid calendar event relation.");
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
