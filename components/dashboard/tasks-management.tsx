"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  DASH_BTN_TABLE,
  DASH_BTN_TABLE_DANGER,
  DASH_BTN_TOOLBAR,
  DASH_FILTER_BAR,
  DASH_SECTION_TITLE,
  DASH_TABLE_ROW,
  DASH_TABLE_TH,
} from "@/components/dashboard/dashboard-classes";
import { EmptyState } from "@/components/ui/empty-state";
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/lib/tasks/catalog";
import type { TaskRow, TaskUserSummary } from "@/lib/tasks/types";

type TaskFormState = {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueAt: string;
  assignedToId: string;
};

type TasksManagementProps = {
  initialTasks: TaskRow[];
  users: TaskUserSummary[];
  isAdmin: boolean;
  currentUserId: string;
};

const emptyForm: TaskFormState = {
  title: "",
  description: "",
  status: "Open",
  priority: "Medium",
  dueAt: "",
  assignedToId: "",
};

const inputClass =
  "w-full rounded-lg border border-input-border bg-bg-primary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-text-secondary/55 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 disabled:cursor-not-allowed disabled:bg-bg-secondary disabled:opacity-70";

const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary";

function toDateTimeLabel(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isOverdue(task: TaskRow): boolean {
  if (!task.dueAt || task.status === "Done" || task.status === "Canceled") return false;
  return new Date(task.dueAt).getTime() < Date.now();
}

function taskToForm(task: TaskRow): TaskFormState {
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    dueAt: toDateTimeLocalValue(task.dueAt),
    assignedToId: task.assignedToId ?? "",
  };
}

function TaskStatusPill({ task }: { task: TaskRow }) {
  const overdue = isOverdue(task);
  const tone = overdue
    ? "border-danger/35 bg-danger/10 text-danger"
    : task.status === "Done"
      ? "border-success/35 bg-success/10 text-success"
      : task.status === "In Progress"
        ? "border-info/35 bg-info/10 text-info"
        : "border-brand-primary/30 bg-brand-primary/10 text-brand-primary";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {overdue ? "Overdue" : task.status}
    </span>
  );
}

function compactPayload(form: TaskFormState, isAdmin: boolean) {
  const payload: Record<string, unknown> = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    status: form.status,
    priority: form.priority,
    dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
  };

  if (isAdmin) {
    payload.assignedToId = form.assignedToId || null;
  }

  return payload;
}

export function TasksManagement({
  initialTasks,
  users,
  isAdmin,
  currentUserId,
}: TasksManagementProps) {
  const router = useRouter();
  const [form, setForm] = useState<TaskFormState>(() => ({
    ...emptyForm,
    assignedToId: isAdmin ? currentUserId : currentUserId,
  }));
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialTasks.filter((task) => {
      if (statusFilter && task.status !== statusFilter) return false;
      if (priorityFilter && task.priority !== priorityFilter) return false;
      if (ownerFilter === "__unassigned__" && task.assignedToId !== null) return false;
      if (ownerFilter && ownerFilter !== "__unassigned__" && task.assignedToId !== ownerFilter) {
        return false;
      }
      if (overdueOnly && !isOverdue(task)) return false;
      if (!q) return true;

      return [task.title, task.description, task.assignedTo?.name, task.createdBy.name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q));
    });
  }, [initialTasks, overdueOnly, ownerFilter, priorityFilter, search, statusFilter]);

  function resetForm() {
    setEditing(null);
    setForm({ ...emptyForm, assignedToId: currentUserId });
  }

  function setField<K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Task title is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(editing ? `/api/tasks/${editing.id}` : "/api/tasks", {
        method: editing ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compactPayload(form, isAdmin)),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        errors?: Record<string, string>;
      } | null;

      if (!res.ok) {
        const msg =
          data?.message ??
          (data?.errors ? Object.values(data.errors).join(" ") : null) ??
          "Could not save task.";
        toast.error(msg);
        return;
      }

      toast.success(editing ? "Task updated." : "Task created.");
      resetForm();
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(task: TaskRow) {
    if (!isAdmin) return;
    const ok = window.confirm(`Delete task "${task.title}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        toast.error(data?.message ?? "Could not delete task.");
        return;
      }
      toast.success("Task deleted.");
      router.refresh();
    } catch {
      toast.error("Network error. Try again.");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
      <section className="rounded-[22px] border border-border/55 bg-bg-primary/80 p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className={DASH_SECTION_TITLE}>{editing ? "Edit task" : "Add task"}</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
              Create manual tasks with due dates, priority, and ownership.
            </p>
          </div>
          {editing ? (
            <button type="button" onClick={resetForm} className={DASH_BTN_TABLE}>
              Cancel
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className={labelClass} htmlFor="task-title">
              Task title
            </label>
            <input
              id="task-title"
              className={inputClass}
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Follow up with client"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="task-description">
              Description
            </label>
            <textarea
              id="task-description"
              className={`${inputClass} min-h-24 resize-y`}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Details, context, or next step"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="task-status">
                Status
              </label>
              <select
                id="task-status"
                className={inputClass}
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
              >
                {TASK_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="task-priority">
                Priority
              </label>
              <select
                id="task-priority"
                className={inputClass}
                value={form.priority}
                onChange={(e) => setField("priority", e.target.value)}
              >
                {TASK_PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="task-due">
                Due date/time
              </label>
              <input
                id="task-due"
                type="datetime-local"
                className={inputClass}
                value={form.dueAt}
                onChange={(e) => setField("dueAt", e.target.value)}
              />
            </div>
            {isAdmin ? (
              <div>
                <label className={labelClass} htmlFor="task-assignee">
                  Assignee
                </label>
                <select
                  id="task-assignee"
                  className={inputClass}
                  value={form.assignedToId}
                  onChange={(e) => setField("assignedToId", e.target.value)}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <button type="submit" disabled={submitting} className={`${DASH_BTN_TOOLBAR} w-full`}>
            {submitting ? "Saving..." : editing ? "Update task" : "Create task"}
          </button>
        </form>
      </section>

      <section className="min-w-0 rounded-[22px] border border-border/55 bg-bg-primary/80 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className={DASH_SECTION_TITLE}>Task list</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
              {filteredTasks.length} / {initialTasks.length} tasks
            </p>
          </div>
          <button
            type="button"
            className={DASH_BTN_TABLE}
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setPriorityFilter("");
              setOwnerFilter("");
              setOverdueOnly(false);
            }}
          >
            Reset filters
          </button>
        </div>

        <div className={`${DASH_FILTER_BAR} mt-4`}>
          <div className="grid gap-2 md:grid-cols-5">
            <input
              className={inputClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
            />
            <select
              className={inputClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {TASK_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All priorities</option>
              {TASK_PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            {isAdmin ? (
              <select
                className={inputClass}
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
              >
                <option value="">All assignees</option>
                <option value="__unassigned__">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            ) : null}
            <label className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm font-semibold text-text-secondary">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="h-4 w-4 accent-brand-primary"
              />
              Overdue only
            </label>
          </div>
        </div>

        {initialTasks.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No tasks yet"
            description="Create a task with a due date to start tracking follow-up work."
          />
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No matching tasks"
            description="Clear or adjust filters to see more tasks."
          />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
            <table className="min-w-full divide-y divide-border/70 text-sm">
              <thead className="bg-bg-secondary/75 text-left">
                <tr>
                  <th className={DASH_TABLE_TH}>Task</th>
                  <th className={DASH_TABLE_TH}>Status</th>
                  <th className={DASH_TABLE_TH}>Priority</th>
                  <th className={DASH_TABLE_TH}>Due</th>
                  <th className={DASH_TABLE_TH}>Assignee</th>
                  <th className={`${DASH_TABLE_TH} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className={DASH_TABLE_ROW}>
                    <td className="min-w-[260px] px-4 py-3 align-top">
                      <div className="font-semibold text-text-primary">{task.title}</div>
                      {task.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                          {task.description}
                        </p>
                      ) : null}
                      <div className="mt-2 text-xs text-text-secondary">
                        Created by {task.createdBy.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <TaskStatusPill task={task} />
                    </td>
                    <td className="px-4 py-3 align-top text-text-secondary">{task.priority}</td>
                    <td className="px-4 py-3 align-top text-text-secondary">
                      {toDateTimeLabel(task.dueAt)}
                    </td>
                    <td className="px-4 py-3 align-top text-text-secondary">
                      {task.assignedTo?.name ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col justify-end gap-2 sm:flex-row">
                        <button
                          type="button"
                          className={DASH_BTN_TABLE}
                          onClick={() => {
                            setEditing(task);
                            setForm(taskToForm(task));
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Edit
                        </button>
                        {isAdmin ? (
                          <button
                            type="button"
                            className={DASH_BTN_TABLE_DANGER}
                            onClick={() => handleDelete(task)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
