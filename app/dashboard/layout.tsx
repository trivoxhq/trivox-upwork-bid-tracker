import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { canTrackAttendance, getRoleCapabilities } from "@/lib/auth/roles";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const caps = getRoleCapabilities(user.role);

  return (
    <DashboardShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        roleLabel: caps.label,
        isAdmin: caps.canManageUsers,
        canWrite: caps.canWrite,
        canTrackAttendance: canTrackAttendance(user.role),
      }}
    >
      {children}
    </DashboardShell>
  );
}
