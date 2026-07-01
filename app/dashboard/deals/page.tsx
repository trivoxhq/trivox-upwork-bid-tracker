import { redirect } from "next/navigation";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { DealsManagement } from "@/components/dashboard/deals-management";
import { getCurrentUser } from "@/lib/auth/session";
import { getCrmPagePermissions } from "@/lib/auth/page-permissions";
import { canViewTeamWide } from "@/lib/auth/roles";
import { DEAL_INCLUDE_USERS, mapDealToRow } from "@/lib/deals/map-deal";
import { prisma } from "@/lib/prisma";

export default async function DashboardDealsPage() {
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

  const perms = getCrmPagePermissions(actor.role);

  const [dealsRaw, usersRaw] = await Promise.all([
    prisma.deal.findMany({
      where: canViewTeamWide(actor.role)
          ? undefined
          : {
              OR: [{ ownerId: actor.id }, { createdById: actor.id }],
            },
      include: DEAL_INCLUDE_USERS,
      orderBy: [{ expectedCloseAt: "asc" }, { updatedAt: "desc" }],
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
        title="Deal tracking"
        description="Track deal value, expected close date, stage, owner, and win probability across your pipeline."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Deal tracking" },
        ]}
      />

      <div className="mt-8">
        <DealsManagement
          initialDeals={dealsRaw.map(mapDealToRow)}
          users={usersRaw}
          isAdmin={perms.canAssign}
          readOnly={perms.readOnly}
          currentUserId={actor.id}
          canDeleteNotes={perms.canDelete}
        />
      </div>
    </div>
  );
}
