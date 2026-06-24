import { redirect } from "next/navigation";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { TasksManagement } from "@/components/dashboard/tasks-management";
import { getCurrentUser } from "@/lib/auth/session";
import { TASK_INCLUDE_USERS, mapTaskToRow } from "@/lib/tasks/map-task";
import { prisma } from "@/lib/prisma";

export default async function DashboardTasksPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const actor = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { id: true, role: true, isActive: true },
  });

  if (!actor?.isActive) {
    redirect("/login");
  }

  const [tasksRaw, usersRaw] = await Promise.all([
    prisma.crmTask.findMany({
      where:
        actor.role === "admin"
          ? undefined
          : {
              OR: [{ assignedToId: actor.id }, { createdById: actor.id }],
            },
      include: TASK_INCLUDE_USERS,
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardPageHero
        eyebrow="CRM"
        title="Task management"
        description="Create manual tasks, assign ownership, set due dates, and track overdue follow-ups."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Task management" },
        ]}
      />

      <div className="mt-8">
        <TasksManagement
          initialTasks={tasksRaw.map(mapTaskToRow)}
          users={usersRaw}
          isAdmin={actor.role === "admin"}
          currentUserId={actor.id}
        />
      </div>
    </div>
  );
}
