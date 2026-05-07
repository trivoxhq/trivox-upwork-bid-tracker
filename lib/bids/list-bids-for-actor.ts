import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function listBidsForActor(actor: { id: string; role: Role }) {
  const where = actor.role === "admin" ? {} : { addedById: actor.id };

  return prisma.bid.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      addedBy: {
        select: { name: true },
      },
      profile: {
        select: { id: true, name: true, isActive: true },
      },
      niche: {
        select: { id: true, name: true, isActive: true },
      },
    },
  });
}
