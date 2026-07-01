import { Prisma } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAssign, canViewTeamWide, canWrite } from "@/lib/auth/roles";
import { isValidTaskPriority, isValidTaskStatus } from "@/lib/tasks/catalog";
import { TASK_INCLUDE_USERS, mapTaskToRow } from "@/lib/tasks/map-task";
import { prisma } from "@/lib/prisma";

type CreateTaskBody = {
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
  dueAt?: unknown;
  assignedToId?: unknown;
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

function parseDueAt(value: unknown, errors: Record<string, string>) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    errors.dueAt = "dueAt must be a date string.";
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    errors.dueAt = "dueAt must be a valid date.";
    return null;
  }
  return d;
}

export async function GET() {
  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const tasks = await prisma.crmTask.findMany({
      where: canViewTeamWide(actor.role)
          ? undefined
          : {
              OR: [{ assignedToId: actor.id }, { createdById: actor.id }],
            },
      include: TASK_INCLUDE_USERS,
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ success: true, tasks: tasks.map(mapTaskToRow) });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    if (!canWrite(actor.role)) return jsonError(403, "Read-only access.");

    let body: CreateTaskBody;
    try {
      body = (await request.json()) as CreateTaskBody;
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    const errors: Record<string, string> = {};
    const title = requiredString(body.title, "title", errors);
    const description = optionalString(body.description, "description", errors);
    const dueAt = parseDueAt(body.dueAt, errors);

    const status = typeof body.status === "string" && body.status.trim() ? body.status.trim() : "Open";
    if (!isValidTaskStatus(status)) errors.status = "status must be a configured task status.";

    const priority =
      typeof body.priority === "string" && body.priority.trim() ? body.priority.trim() : "Medium";
    if (!isValidTaskPriority(priority)) {
      errors.priority = "priority must be a configured task priority.";
    }

    let assignedToId = actor.id;
    if (canAssign(actor.role)) {
      const parsedAssignee = optionalString(body.assignedToId, "assignedToId", errors);
      assignedToId = parsedAssignee ?? actor.id;
    }

    const assignee = await prisma.user.findFirst({
      where: { id: assignedToId, isActive: true },
      select: { id: true },
    });
    if (!assignee) errors.assignedToId = "Choose an active assignee.";

    if (Object.keys(errors).length > 0) return jsonError(400, "Validation failed.", errors);

    const task = await prisma.crmTask.create({
      data: {
        title: title!,
        description,
        status,
        priority,
        dueAt,
        assignedToId,
        createdById: actor.id,
        completedAt: status === "Done" ? new Date() : null,
      },
      include: TASK_INCLUDE_USERS,
    });

    return NextResponse.json({ success: true, task: mapTaskToRow(task) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return jsonError(400, "Invalid task relation.");
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
