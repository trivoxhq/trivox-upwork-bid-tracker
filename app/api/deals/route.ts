import { Prisma } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readOnlyForbiddenResponse } from "@/lib/auth/api-guards";
import { canAssign, canViewTeamWide, canWrite } from "@/lib/auth/roles";
import { isValidDealStage, isValidProbability } from "@/lib/deals/catalog";
import { DEAL_INCLUDE_USERS, mapDealToRow } from "@/lib/deals/map-deal";
import { prisma } from "@/lib/prisma";

type CreateDealBody = {
  title?: unknown;
  clientName?: unknown;
  value?: unknown;
  stage?: unknown;
  probability?: unknown;
  expectedCloseAt?: unknown;
  notes?: unknown;
  ownerId?: unknown;
};

function jsonError(status: number, message: string, errors?: Record<string, string>) {
  return NextResponse.json(
    errors ? { success: false, message, errors } : { success: false, message },
    { status },
  );
}

async function getActiveActor() {
  const session = await getCurrentUser();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, role: true, isActive: true },
  });
}

function requiredString(value: unknown, field: string, errors: Record<string, string>) {
  if (typeof value !== "string" || !value.trim()) {
    errors[field] = `${field} is required.`;
    return null;
  }
  return value.trim();
}

function optionalString(value: unknown, field: string, errors: Record<string, string>) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    errors[field] = `${field} must be a string.`;
    return null;
  }
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function parseValue(value: unknown, errors: Record<string, string>) {
  if (value === undefined || value === null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    errors.value = "value must be a non-negative whole number.";
    return 0;
  }
  return n;
}

function parseProbability(value: unknown, errors: Record<string, string>) {
  if (value === undefined || value === null || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || !isValidProbability(n)) {
    errors.probability = "probability must be an integer from 0 to 100.";
    return 0;
  }
  return n;
}

function parseExpectedCloseAt(value: unknown, errors: Record<string, string>) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    errors.expectedCloseAt = "expectedCloseAt must be a date string.";
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    errors.expectedCloseAt = "expectedCloseAt must be a valid date.";
    return null;
  }
  return d;
}

export async function GET() {
  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const deals = await prisma.deal.findMany({
      where: canViewTeamWide(actor.role)
          ? undefined
          : {
              OR: [{ ownerId: actor.id }, { createdById: actor.id }],
            },
      include: DEAL_INCLUDE_USERS,
      orderBy: [{ expectedCloseAt: "asc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ success: true, deals: deals.map(mapDealToRow) });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    if (!canWrite(actor.role)) return readOnlyForbiddenResponse();

    let body: CreateDealBody;
    try {
      body = (await request.json()) as CreateDealBody;
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    const errors: Record<string, string> = {};
    const title = requiredString(body.title, "title", errors);
    const clientName = requiredString(body.clientName, "clientName", errors);
    const value = parseValue(body.value, errors);
    const probability = parseProbability(body.probability, errors);
    const expectedCloseAt = parseExpectedCloseAt(body.expectedCloseAt, errors);
    const notes = optionalString(body.notes, "notes", errors);

    const stage =
      typeof body.stage === "string" && body.stage.trim() ? body.stage.trim() : "Qualification";
    if (!isValidDealStage(stage)) {
      errors.stage = "stage must be one of the configured deal stages.";
    }

    let ownerId = actor.id;
    if (canAssign(actor.role)) {
      ownerId = optionalString(body.ownerId, "ownerId", errors) ?? actor.id;
    }

    const owner = await prisma.user.findFirst({
      where: { id: ownerId, isActive: true },
      select: { id: true },
    });
    if (!owner) errors.ownerId = "Choose an active owner.";

    if (Object.keys(errors).length > 0) return jsonError(400, "Validation failed.", errors);

    const deal = await prisma.deal.create({
      data: {
        title: title!,
        clientName: clientName!,
        value,
        stage,
        probability,
        expectedCloseAt,
        notes,
        ownerId,
        createdById: actor.id,
      },
      include: DEAL_INCLUDE_USERS,
    });

    return NextResponse.json({ success: true, deal: mapDealToRow(deal) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return jsonError(400, "Invalid deal relation.");
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
