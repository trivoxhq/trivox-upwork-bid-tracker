import { redirect } from "next/navigation";
import { ClientsManagement } from "@/components/dashboard/clients-management";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { getCurrentUser } from "@/lib/auth/session";
import { getCrmPagePermissions } from "@/lib/auth/page-permissions";
import { CLIENT_INCLUDE_HISTORY, mapClientToRow } from "@/lib/clients/map-client";
import { prisma } from "@/lib/prisma";

export default async function DashboardClientsPage() {
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

  const clients = await prisma.client.findMany({
    include: CLIENT_INCLUDE_HISTORY,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardPageHero
        eyebrow="CRM"
        title="Client profiles"
        description="Store client details and build a manual history of notes, calls, emails, meetings, proposals, and status updates."
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Client profiles" },
        ]}
      />

      <div className="mt-8">
        <ClientsManagement
          initialClients={clients.map(mapClientToRow)}
          isAdmin={perms.canAssign}
          readOnly={perms.readOnly}
          currentUserId={actor.id}
          canDeleteNotes={perms.canDelete}
        />
      </div>
    </div>
  );
}
