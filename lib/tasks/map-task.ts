import type { TaskRow } from "@/lib/tasks/types";

type UserSummary = { id: string; name: string; email: string };

type TaskWithUsers = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: Date | null;
  assignedToId: string | null;
  assignedTo: UserSummary | null;
  createdBy: UserSummary;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const TASK_INCLUDE_USERS = {
  assignedTo: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

export function mapTaskToRow(task: TaskWithUsers): TaskRow {
  return {
    ...task,
    dueAt: task.dueAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
