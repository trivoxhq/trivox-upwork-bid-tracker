import type { Role } from "@/generated/prisma-client";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  dailyTarget: number;
  monthlyTarget: number;
  isActive: boolean;
  createdAt: string;
};
