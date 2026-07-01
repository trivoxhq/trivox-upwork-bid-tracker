import { isValidTaskPriority, isValidTaskStatus } from "@/lib/tasks/catalog";
import type { ImportResult, UserLookup } from "@/lib/spreadsheet/import-helpers";
import {
  parseOptionalDate,
  pickField,
  resolveUserRef,
  rowToRecord,
} from "@/lib/spreadsheet/import-helpers";
import { canAssign, canViewTeamWide } from "@/lib/auth/roles";
import type { Role } from "@/generated/prisma-client";
import { prisma } from "@/lib/prisma";

export const TASK_EXPORT_HEADERS = [
  "Title",
  "Description",
  "Status",
  "Priority",
  "Due Date",
  "Assigned To",
  "Created By",
  "Created At",
] as const;

type TaskExportSource = {
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: Date | null;
  assignedTo: { name: string; email: string } | null;
  createdBy: { name: string };
  createdAt: Date;
};

export function buildTaskExportRows(tasks: TaskExportSource[]): string[][] {
  return tasks.map((task) => [
    task.title,
    task.description ?? "",
    task.status,
    task.priority,
    task.dueAt ? task.dueAt.toISOString().slice(0, 10) : "",
    task.assignedTo ? `${task.assignedTo.name} (${task.assignedTo.email})` : "",
    task.createdBy.name,
    task.createdAt.toISOString().slice(0, 10),
  ]);
}

export async function importTaskRows(
  headers: string[],
  rows: string[][],
  actor: { id: string; role: Role },
  users: UserLookup[],
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2;
    const record = rowToRecord(headers, rows[i]);
    const rowErrors: string[] = [];

    const title = pickField(record, "title");
    if (!title) rowErrors.push("Title is required.");

    const status = pickField(record, "status") || "Open";
    if (!isValidTaskStatus(status)) rowErrors.push("Status must be Open, In Progress, Done, or Canceled.");

    const priority = pickField(record, "priority") || "Medium";
    if (!isValidTaskPriority(priority)) rowErrors.push("Priority must be Low, Medium, High, or Urgent.");

    const dueAt = parseOptionalDate(pickField(record, "due_date", "due_at", "due"), "Due Date", rowErrors);

    let assignedToId: string | null = null;
    const assignRef = pickField(record, "assigned_to", "assignee", "owner");
    if (canAssign(actor.role)) {
      if (assignRef) {
        assignedToId = resolveUserRef(assignRef, users);
        if (!assignedToId) rowErrors.push("Assigned To could not be matched to a team member.");
      }
    } else {
      assignedToId = actor.id;
    }

    if (rowErrors.length > 0) {
      result.failed += 1;
      result.errors.push({ row: rowNum, message: rowErrors.join(" ") });
      continue;
    }

    try {
      await prisma.crmTask.create({
        data: {
          title: title!,
          description: pickField(record, "description") || null,
          status,
          priority,
          dueAt,
          assignedToId,
          createdById: actor.id,
        },
      });
      result.created += 1;
    } catch {
      result.failed += 1;
      result.errors.push({ row: rowNum, message: "Could not save task." });
    }
  }

  return result;
}

export function taskExportWhere(actor: { id: string; role: Role }) {
  return canViewTeamWide(actor.role)
    ? undefined
    : {
        OR: [{ assignedToId: actor.id }, { createdById: actor.id }],
      };
}

export const TASK_EXPORT_INCLUDE = {
  assignedTo: { select: { name: true, email: true } },
  createdBy: { select: { name: true } },
} as const;
