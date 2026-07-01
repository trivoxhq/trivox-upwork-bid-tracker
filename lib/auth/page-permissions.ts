import type { Role } from "@/generated/prisma-client";
import { getRoleCapabilities } from "@/lib/auth/roles";

export function getCrmPagePermissions(role: Role) {
  const caps = getRoleCapabilities(role);
  return {
    canAssign: caps.canAssign,
    canDelete: caps.canDelete,
    canViewTeamWide: caps.canViewTeamWide,
    readOnly: !caps.canWrite,
    canViewTeamStats: caps.canViewTeamStats,
    canEditAnyBid: caps.canEditAnyBid,
    isAdmin: caps.isAdmin,
    canManageUsers: caps.canManageUsers,
    canManageSettings: caps.canManageSettings,
    roleLabel: caps.label,
  };
}
