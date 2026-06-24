export type TaskUserSummary = {
  id: string;
  name: string;
  email: string;
};

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  assignedToId: string | null;
  assignedTo: TaskUserSummary | null;
  createdBy: TaskUserSummary;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
