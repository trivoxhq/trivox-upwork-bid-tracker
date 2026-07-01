import type { Role } from "@/generated/prisma-client";
import { canEditAnyBid, canViewTeamWide } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export async function listBidsForActor(actor: { id: string; role: Role }) {
  const where = canViewTeamWide(actor.role) ? {} : { addedById: actor.id };

  const bids = await prisma.bid.findMany({
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
      deal: {
        select: { id: true, title: true },
      },
    },
  });

  return bids.map((bid) => ({
    ...bid,
    memberEditLocked: !canEditAnyBid(actor.role),
  }));
}
