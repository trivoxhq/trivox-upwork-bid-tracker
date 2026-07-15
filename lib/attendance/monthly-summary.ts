export type MonthlyDayRow = {
  id: string;
  workDate: string;
  checkInAt: string;
  checkOutAt: string | null;
  workingMinutes: number;
  breakMinutes: number;
  dayType: string | null;
  status: string;
  salaryAmount: number | null;
};

export type MonthlyUserSummary = {
  userId: string;
  name: string;
  email: string;
  monthlySalary: number;
  daysAttended: number;
  fullDays: number;
  halfDays: number;
  openDays: number;
  totalWorkingMinutes: number;
  totalBreakMinutes: number;
  totalSalary: number;
  days: MonthlyDayRow[];
};

export function monthBounds(month: string): { from: Date; to: Date; label: string } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [yRaw, mRaw] = month.split("-");
  const y = Number(yRaw);
  const m = Number(mRaw);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null;

  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 0)); // last day of month
  const label = from.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { from, to, label };
}

export function currentMonthKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function formatMinutesLabel(minutes: number): string {
  const h = Math.floor(Math.max(0, minutes) / 60);
  const m = Math.floor(Math.max(0, minutes) % 60);
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
