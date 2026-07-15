import type { Role } from "@/generated/prisma-client";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  dailyTarget: number;
  weeklyTarget: number;
  monthlyTarget: number;
  hourlyRate: number;
  monthlySalary: number;
  isActive: boolean;
  createdAt: string;
};
