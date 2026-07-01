import type { Role } from "@/generated/prisma-client";

export const ROLE_VALUES = [
  "admin",
  "manager",
  "sales_member",
  "viewer",
  "member",
] as const satisfies readonly Role[];

export const ASSIGNABLE_ROLES = [
  "admin",
  "manager",
  "sales_member",
  "viewer",
  "member",
] as const satisfies readonly Role[];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  manager: "Manager",
  sales_member: "Sales member",
  viewer: "Viewer",
  member: "Member",
};

export type RoleCapabilities = {
  role: Role;
  label: string;
  isAdmin: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewTeamWide: boolean;
  canWrite: boolean;
  canAssign: boolean;
  canDelete: boolean;
  canViewTeamStats: boolean;
  canEditAnyBid: boolean;
};

export function isValidRole(value: string): value is Role {
  return (ROLE_VALUES as readonly string[]).includes(value);
}

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}

export function isSalesRole(role: Role): boolean {
  return role === "sales_member" || role === "member";
}

export function canViewTeamWide(role: Role): boolean {
  return role === "admin" || role === "manager" || role === "viewer";
}

export function canWrite(role: Role): boolean {
  return role !== "viewer";
}

export function canAssign(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function canDelete(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function canManageUsers(role: Role): boolean {
  return role === "admin";
}

export function canManageSettings(role: Role): boolean {
  return role === "admin";
}

export function canViewTeamStats(role: Role): boolean {
  return role === "admin" || role === "manager" || role === "viewer";
}

export function canEditAnyBid(role: Role): boolean {
  return role === "admin" || role === "manager";
}

export function getRoleCapabilities(role: Role): RoleCapabilities {
  return {
    role,
    label: roleLabel(role),
    isAdmin: role === "admin",
    canManageUsers: canManageUsers(role),
    canManageSettings: canManageSettings(role),
    canViewTeamWide: canViewTeamWide(role),
    canWrite: canWrite(role),
    canAssign: canAssign(role),
    canDelete: canDelete(role),
    canViewTeamStats: canViewTeamStats(role),
    canEditAnyBid: canEditAnyBid(role),
  };
}

export function assertCanWrite(role: Role): void {
  if (!canWrite(role)) {
    throw new Error("READ_ONLY");
  }
}
