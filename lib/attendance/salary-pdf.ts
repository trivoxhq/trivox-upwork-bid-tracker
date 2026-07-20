import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatMinutesLabel,
  type MonthlyUserSummary,
} from "@/lib/attendance/monthly-summary";

function money(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function dayTypeLabel(dayType: string | null, status: string): string {
  if (status === "open") return "Open";
  if (dayType === "half_day") return "Half-Day Check-Out";
  if (dayType === "full_day") return "Check Out";
  return dayType?.replace("_", " ") ?? status;
}

/** Team payroll PDF for a month. */
export function downloadTeamSalaryPdf(params: {
  monthLabel: string;
  users: MonthlyUserSummary[];
  totalSalary: number;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const title = `Monthly salary — ${params.monthLabel}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 40, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text("Attendance payroll from completed check-outs.", 40, 66);
  doc.setTextColor(20);

  autoTable(doc, {
    startY: 84,
    head: [["Member", "Days", "Full", "Half", "Worked", "Break", "Pay"]],
    body: params.users.map((u) => [
      u.name,
      String(u.daysAttended),
      String(u.fullDays),
      String(u.halfDays),
      formatMinutesLabel(u.totalWorkingMinutes),
      formatMinutesLabel(u.totalBreakMinutes),
      money(u.totalSalary),
    ]),
    foot: [
      [
        "Total",
        String(params.users.reduce((s, u) => s + u.daysAttended, 0)),
        "",
        "",
        "",
        "",
        money(params.totalSalary),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [55, 154, 109], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    margin: { left: 40, right: 40 },
  });

  const stamp = new Date().toLocaleString();
  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Generated ${stamp}`, 40, finalY + 24);

  doc.save(`monthly-salary-${params.monthLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

/** Per-member day table PDF for a month. */
export function downloadUserSalaryPdf(params: {
  monthLabel: string;
  user: MonthlyUserSummary;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const { user, monthLabel } = params;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Salary detail — ${user.name}`, 40, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`${monthLabel} · ${user.email}`, 40, 66);
  doc.text(
    `Days attended: ${user.daysAttended} · Pay: ${money(user.totalSalary)} · Monthly base: ${money(user.monthlySalary)}`,
    40,
    82,
  );
  doc.setTextColor(20);

  autoTable(doc, {
    startY: 100,
    head: [["Date", "In", "Out", "Work", "Break", "Type", "Pay"]],
    body: user.days.map((d) => [
      d.workDate,
      new Date(d.checkInAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
      d.checkOutAt
        ? new Date(d.checkOutAt).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })
        : "—",
      formatMinutesLabel(d.workingMinutes),
      formatMinutesLabel(d.breakMinutes),
      dayTypeLabel(d.dayType, d.status),
      d.salaryAmount != null ? money(d.salaryAmount) : "—",
    ]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [55, 154, 109], textColor: 255 },
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
      6: { halign: "right" },
    },
    margin: { left: 40, right: 40 },
  });

  doc.save(
    `salary-${user.name.replace(/\s+/g, "-").toLowerCase()}-${monthLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`,
  );
}
