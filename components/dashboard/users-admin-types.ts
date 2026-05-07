export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  dailyTarget: number;
  monthlyTarget: number;
  isActive: boolean;
  createdAt: string;
};
