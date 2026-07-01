import { Prisma } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readOnlyForbiddenResponse } from "@/lib/auth/api-guards";
import { canAssign, canDelete, canViewTeamWide, canWrite } from "@/lib/auth/roles";
import { isValidTaskPriority, isValidTaskStatus } from "@/lib/tasks/catalog";
import { TASK_INCLUDE_USERS, mapTaskToRow } from "@/lib/tasks/map-task";
import { prisma } from "@/lib/prisma";

const UPDATABLE_KEYS = new Set([
  "title",
  "description",
  "status",
  "priority",
  "dueAt",
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
    select: { id: true, isActive: true, role: true },
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

function parseDueAt(value: unknown, errors: Record<string, string>) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    errors.dueAt = "dueAt must be a date string or null.";
    return undefined;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    errors.dueAt = "dueAt must be a valid date.";
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
    if (!id?.trim()) return jsonError(400, "Task id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const existing = await prisma.crmTask.findUnique({
      where: { id },
      select: { id: true, assignedToId: true, createdById: true },
    });
    if (!existing) return jsonError(404, "Task not found.");

    const canAccess =
      canViewTeamWide(actor.role) ||
      existing.assignedToId === actor.id ||
      existing.createdById === actor.id;
    if (!canAccess) return jsonError(403, "You do not have access to this task.");

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
    const data: Prisma.CrmTaskUpdateInput = {};

    const title = requiredUpdateString(body.title, "title", errors);
    if (title !== undefined && !errors.title) data.title = title;

    if ("description" in body) {
      const description = optionalNullableString(body.description, "description", errors);
      if (description !== undefined && !errors.description) data.description = description;
    }

    if ("status" in body) {
      const status = requiredUpdateString(body.status, "status", errors);
      if (status && !isValidTaskStatus(status)) {
        errors.status = "status must be a configured task status.";
      } else if (status && !errors.status) {
        data.status = status;
        data.completedAt = status === "Done" ? new Date() : null;
      }
    }

    if ("priority" in body) {
      const priority = requiredUpdateString(body.priority, "priority", errors);
      if (priority && !isValidTaskPriority(priority)) {
        errors.priority = "priority must be a configured task priority.";
      } else if (priority && !errors.priority) {
        data.priority = priority;
      }
    }

    if ("dueAt" in body) {
      const dueAt = parseDueAt(body.dueAt, errors);
      if (dueAt !== undefined && !errors.dueAt) data.dueAt = dueAt;
    }

    if ("assignedToId" in body) {
      if (!canAssign(actor.role)) {
        errors.assignedToId = "Only administrators and managers can reassign tasks.";
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
            errors.assignedToId = "Choose an active assignee.";
          } else {
            data.assignedTo = { connect: { id: assignedToId } };
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) return jsonError(400, "Validation failed.", errors);
    if (Object.keys(data).length === 0) return jsonError(400, "No updates provided.");

    const task = await prisma.crmTask.update({
      where: { id },
      data,
      include: TASK_INCLUDE_USERS,
    });

    return NextResponse.json({ success: true, task: mapTaskToRow(task) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError(404, "Task not found.");
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
    if (!id?.trim()) return jsonError(400, "Task id is required.");

    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");
    if (!canDelete(actor.role)) return jsonError(403, "Only administrators and managers can delete tasks.");

    await prisma.crmTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonError(404, "Task not found.");
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
