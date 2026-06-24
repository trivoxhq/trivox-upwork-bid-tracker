export const TASK_STATUS_OPTIONS = ["Open", "In Progress", "Done", "Canceled"] as const;

export const TASK_PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"] as const;

export type TaskStatus = (typeof TASK_STATUS_OPTIONS)[number];
export type TaskPriority = (typeof TASK_PRIORITY_OPTIONS)[number];

export function isValidTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUS_OPTIONS as readonly string[]).includes(value);
}

export function isValidTaskPriority(value: string): value is TaskPriority {
  return (TASK_PRIORITY_OPTIONS as readonly string[]).includes(value);
}
