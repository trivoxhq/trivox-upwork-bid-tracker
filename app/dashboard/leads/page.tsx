import { redirect } from "next/navigation";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { LeadsManagement } from "@/components/dashboard/leads-management";
import { getCurrentUser } from "@/lib/auth/session";
import { LEAD_INCLUDE_USERS, mapLeadToRow } from "@/lib/leads/map-lead";
import { prisma } from "@/lib/prisma";

export default async function DashboardLeadsPage() {
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

  const [leadsRaw, usersRaw] = await Promise.all([
    prisma.lead.findMany({
      where:
        actor.role === "admin"
          ? undefined
          : {
              OR: [{ assignedToId: actor.id }, { createdById: actor.id }],
            },
      include: LEAD_INCLUDE_USERS,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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
        title="Lead management"
        description="Add, assign, filter, and track leads through the sales pipeline before they become bids or booked work."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Lead management" },
        ]}
      />

      <div className="mt-8">
        <LeadsManagement
          initialLeads={leadsRaw.map(mapLeadToRow)}
          users={usersRaw}
          isAdmin={actor.role === "admin"}
          currentUserId={actor.id}
        />
      </div>
    </div>
  );
}
