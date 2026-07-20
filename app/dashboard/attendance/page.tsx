import { redirect } from "next/navigation";
import { AttendancePageClient } from "@/components/dashboard/attendance-page-client";
import { DashboardPageHero } from "@/components/dashboard/dashboard-page-hero";
import { getCurrentUser } from "@/lib/auth/session";
import { canTrackAttendance, canViewTeamWide, canWrite } from "@/lib/auth/roles";

export default async function DashboardAttendancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canWrite(user.role) && !canViewTeamWide(user.role)) {
    redirect("/dashboard");
  }

  const tracksAttendance = canTrackAttendance(user.role);
  const isAdmin = user.role === "admin";

  return (
    <div className="flex min-w-0 flex-col">
      <DashboardPageHero
        eyebrow="Workforce"
        title="Attendance"
        description={
          isAdmin
            ? "Administrators are exempt from check-in. Review days attended per member and download monthly salary PDFs."
            : "Check in/out and breaks. Leave early as Half-Day Check-Out, or Check Out after full-day hours. Pay is calculated from your monthly salary and worked minutes."
        }
        breadcrumb={[
          { href: "/dashboard", label: "Dashboard" },
          { label: "Attendance" },
        ]}
      />

      <div className="mt-8">
        <AttendancePageClient
          showTeamHistory={canViewTeamWide(user.role)}
          readOnly={!tracksAttendance}
          adminExempt={isAdmin}
        />
      </div>
    </div>
  );
}
