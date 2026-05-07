/** Fields exposed to admins (never includes password). */
export const ADMIN_USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  dailyTarget: true,
  monthlyTarget: true,
  isActive: true,
  createdAt: true,
} as const;
