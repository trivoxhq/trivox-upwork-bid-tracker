import { Prisma } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { BID_STATUS_LABELS, isValidBidStatus } from "@/lib/bids/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { canEditAnyBid, canDelete } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

const ADMIN_UPDATABLE_KEYS = new Set([
  "date",
  "profileId",
  "client",
  "bidLink",
  "nicheId",
  "status",
  "value",
  "notes",
  "addedById",
]);

function jsonError(status: number, message: string, errors?: Record<string, string>) {
  return NextResponse.json(
    errors ? { success: false, message, errors } : { success: false, message },
    { status },
  );
}

function parseNotesField(value: unknown, errors: Record<string, string>) {
  if (value === null) return null as string | null;
  if (typeof value !== "string") {
    errors.notes = "notes must be a string or null.";
    return undefined;
  }
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function parseStatus(value: unknown, errors: Record<string, string>): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    errors.status = "status must be a non-empty string.";
    return undefined;
  }
  const t = value.trim();
  if (!isValidBidStatus(t)) {
    errors.status = `status must be one of: ${BID_STATUS_LABELS.join(", ")}.`;
    return undefined;
  }
  return t;
}

async function buildAdminUpdate(
  body: Record<string, unknown>,
): Promise<{ data: Prisma.BidUpdateInput } | { response: NextResponse }> {
  const errors: Record<string, string> = {};
  const data: Prisma.BidUpdateInput = {};

  if ("date" in body && body.date !== undefined) {
    if (typeof body.date !== "string" || !body.date.trim()) {
      errors.date = "date must be a non-empty ISO date string.";
    } else {
      const d = new Date(body.date);
      if (Number.isNaN(d.getTime())) {
        errors.date = "date must be a valid date.";
      } else {
        data.date = d;
      }
    }
  }

  if ("profileId" in body && body.profileId !== undefined) {
    if (typeof body.profileId !== "string" || !body.profileId.trim()) {
      errors.profileId = "profileId must be a non-empty string.";
    } else {
      const p = body.profileId.trim();
      const profile = await prisma.profile.findUnique({
        where: { id: p },
        select: { id: true },
      });
      if (!profile) {
        errors.profileId = "Unknown profile.";
      } else {
        data.profile = { connect: { id: p } };
      }
    }
  }

  if ("client" in body && body.client !== undefined) {
    if (typeof body.client !== "string" || !body.client.trim()) {
      errors.client = "client must be a non-empty string.";
    } else {
      data.client = body.client.trim();
    }
  }

  if ("bidLink" in body && body.bidLink !== undefined) {
    if (body.bidLink === null) {
      data.bidLink = null;
    } else if (typeof body.bidLink !== "string") {
      errors.bidLink = "bidLink must be a string or null.";
    } else {
      const t = body.bidLink.trim();
      data.bidLink = t.length > 0 ? t : null;
    }
  }

  if ("nicheId" in body && body.nicheId !== undefined) {
    if (typeof body.nicheId !== "string" || !body.nicheId.trim()) {
      errors.nicheId = "nicheId must be a non-empty string.";
    } else {
      const n = body.nicheId.trim();
      const niche = await prisma.niche.findUnique({
        where: { id: n },
        select: { id: true },
      });
      if (!niche) {
        errors.nicheId = "Unknown niche.";
      } else {
        data.niche = { connect: { id: n } };
      }
    }
  }

  if ("status" in body && body.status !== undefined) {
    const s = parseStatus(body.status, errors);
    if (s !== undefined && !errors.status) data.status = s;
  }

  if ("value" in body && body.value !== undefined) {
    const v = body.value;
    if (typeof v !== "number" || !Number.isFinite(v)) {
      errors.value = "value must be a number.";
    } else if (!Number.isInteger(v)) {
      errors.value = "value must be an integer.";
    } else {
      data.value = v;
    }
  }

  if ("notes" in body && body.notes !== undefined) {
    const n = parseNotesField(body.notes, errors);
    if (n !== undefined && !errors.notes) data.notes = n;
  }

  if ("addedById" in body && body.addedById !== undefined) {
    if (typeof body.addedById !== "string" || !body.addedById.trim()) {
      errors.addedById = "addedById must be a non-empty string.";
    } else {
      const aid = body.addedById.trim();
      const owner = await prisma.user.findUnique({
        where: { id: aid },
        select: { id: true },
      });
      if (!owner) {
        errors.addedById = "No user exists with this id.";
      } else {
        data.addedBy = { connect: { id: aid } };
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { response: jsonError(400, "Validation failed.", errors) };
  }

  if (Object.keys(data).length === 0) {
    return { response: jsonError(400, "No updates provided.") };
  }

  return { data };
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) {
      return jsonError(400, "Bid id is required.");
    }

    const session = await getCurrentUser();
    if (!session) {
      return jsonError(401, "Unauthorized.");
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, isActive: true, role: true },
    });

    if (!actor?.isActive) {
      return jsonError(401, "Unauthorized.");
    }

    const bid = await prisma.bid.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!bid) {
      return jsonError(404, "Bid not found.");
    }

    if (!canEditAnyBid(actor.role)) {
      return jsonError(403, "Only administrators and managers can edit bids.");
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return jsonError(400, "Body must be a JSON object.");
    }

    const bodyKeys = Object.keys(body);

    const unknownAdminKeys = bodyKeys.filter((k) => !ADMIN_UPDATABLE_KEYS.has(k));
    if (unknownAdminKeys.length > 0) {
      return jsonError(400, `Unknown fields: ${unknownAdminKeys.join(", ")}.`);
    }

    const built = await buildAdminUpdate(body);
    if ("response" in built) return built.response;

    const updated = await prisma.bid.update({
      where: { id },
      data: built.data,
      include: {
        addedBy: { select: { name: true } },
        profile: { select: { id: true, name: true, isActive: true } },
        niche: { select: { id: true, name: true, isActive: true } },
      },
    });

    return NextResponse.json({ success: true, bid: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return jsonError(404, "Bid not found.");
      }
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) {
      return jsonError(400, "Bid id is required.");
    }

    const session = await getCurrentUser();
    if (!session) {
      return jsonError(401, "Unauthorized.");
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, isActive: true, role: true },
    });

    if (!actor?.isActive) {
      return jsonError(401, "Unauthorized.");
    }

    if (!canDelete(actor.role)) {
      return jsonError(403, "Only administrators and managers can delete bids.");
    }

    await prisma.bid.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return jsonError(404, "Bid not found.");
      }
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
