/**
 * Monthly salary → pro-rated pay for recorded working minutes.
 *
 * Example: monthlySalary = 100_000, workingDaysPerMonth = 22, full day = 480 min
 *   full day pay  ≈ 100_000 / 22
 *   half day (300m) ≈ 100_000 × 300 / (22 × 480)
 */
export function calculateAttendanceSalary(params: {
  monthlySalary: number;
  workingMinutes: number;
  workingDaysPerMonth: number;
  fullDayWorkingMinutes: number;
}): number {
  const monthly = Math.max(0, params.monthlySalary);
  const days = Math.max(1, params.workingDaysPerMonth);
  const fullDay = Math.max(1, params.fullDayWorkingMinutes);
  const worked = Math.max(0, params.workingMinutes);

  const monthWorkingMinutes = days * fullDay;
  return Math.round((monthly * worked) / monthWorkingMinutes);
}

export function dailySalaryFromMonthly(monthlySalary: number, workingDaysPerMonth: number): number {
  const days = Math.max(1, workingDaysPerMonth);
  return Math.round(Math.max(0, monthlySalary) / days);
}

export function hourlyFromMonthly(
  monthlySalary: number,
  workingDaysPerMonth: number,
  fullDayWorkingMinutes: number,
): number {
  const days = Math.max(1, workingDaysPerMonth);
  const hours = Math.max(1, fullDayWorkingMinutes) / 60;
  return Math.round(Math.max(0, monthlySalary) / (days * hours));
}
