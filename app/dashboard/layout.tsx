import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.role === "admin",
      }}
    >
      {children}
    </DashboardShell>
  );
}
