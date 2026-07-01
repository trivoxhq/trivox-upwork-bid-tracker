import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type ActiveActor = {
  id: string;
  role: import("@/generated/prisma-client").Role;
  isActive: boolean;
};

export async function getActiveActor(): Promise<ActiveActor | null> {
  const session = await getCurrentUser();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, role: true, isActive: true },
  });
}

export async function getActiveUsersForImport() {
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
