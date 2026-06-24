import { redirect } from "next/navigation";
import { CalendarManagement } from "@/components/dashboard/calendar-management";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { getCurrentUser } from "@/lib/auth/session";
import {
  CALENDAR_EVENT_INCLUDE_USERS,
  mapCalendarEventToRow,
} from "@/lib/calendar/map-calendar-event";
import { prisma } from "@/lib/prisma";

export default async function DashboardCalendarPage() {
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

  const [eventsRaw, usersRaw] = await Promise.all([
    prisma.calendarEvent.findMany({
      where:
        actor.role === "admin"
          ? undefined
          : {
              OR: [{ ownerId: actor.id }, { createdById: actor.id }],
            },
      include: CALENDAR_EVENT_INCLUDE_USERS,
      orderBy: [{ startsAt: "asc" }, { updatedAt: "desc" }],
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
        title="Calendar"
        description="Track meetings, follow-ups, deadlines, renewal dates, and reminders in one monthly view."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Calendar" },
        ]}
      />

      <div className="mt-8">
        <CalendarManagement
          initialEvents={eventsRaw.map(mapCalendarEventToRow)}
          users={usersRaw}
          isAdmin={actor.role === "admin"}
          currentUserId={actor.id}
        />
      </div>
    </div>
  );
}
