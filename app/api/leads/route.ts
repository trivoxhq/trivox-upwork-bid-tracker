import { Prisma } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readOnlyForbiddenResponse } from "@/lib/auth/api-guards";
import { canAssign, canViewTeamWide, canWrite } from "@/lib/auth/roles";
import { isValidLeadStatus } from "@/lib/leads/catalog";
import { resolveLostReasonForLead } from "@/lib/lost-reasons/normalize";
import { logCrmAudit } from "@/lib/audit/log-crm-audit";
import { LEAD_INCLUDE_USERS, mapLeadToRow } from "@/lib/leads/map-lead";
import { prisma } from "@/lib/prisma";

type CreateLeadBody = {
  title?: unknown;
  clientName?: unknown;
  email?: unknown;
  phone?: unknown;
  company?: unknown;
  country?: unknown;
  source?: unknown;
  status?: unknown;
  notes?: unknown;
  assignedToId?: unknown;
  lostReason?: unknown;
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

function parseStatus(value: unknown, errors: Record<string, string>) {
  if (value === undefined || value === null || value === "") return "New";
  if (typeof value !== "string" || !value.trim()) {
    errors.status = "status must be a non-empty string.";
    return "New";
  }
  const status = value.trim();
  if (!isValidLeadStatus(status)) {
    errors.status = "status must be one of the configured pipeline stages.";
  }
  return status;
}

export async function GET() {
  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const leads = await prisma.lead.findMany({
      where: canViewTeamWide(actor.role)
          ? undefined
          : {
              OR: [{ assignedToId: actor.id }, { createdById: actor.id }],
            },
      include: LEAD_INCLUDE_USERS,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, leads: leads.map(mapLeadToRow) });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    if (!canWrite(actor.role)) return readOnlyForbiddenResponse();

    let body: CreateLeadBody;
    try {
      body = (await request.json()) as CreateLeadBody;
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    const errors: Record<string, string> = {};
    const title = requiredString(body.title, "title", errors);
    const clientName = requiredString(body.clientName, "clientName", errors);
    const status = parseStatus(body.status, errors);
    const email = optionalString(body.email, "email", errors);
    const phone = optionalString(body.phone, "phone", errors);
    const company = optionalString(body.company, "company", errors);
    const country = optionalString(body.country, "country", errors);
    const source = optionalString(body.source, "source", errors);
    const notes = optionalString(body.notes, "notes", errors);

    let assignedToId: string | null = null;
    if (canAssign(actor.role)) {
      assignedToId = optionalString(body.assignedToId, "assignedToId", errors);
      if (assignedToId) {
        const assignee = await prisma.user.findFirst({
          where: { id: assignedToId, isActive: true },
          select: { id: true },
        });
        if (!assignee) errors.assignedToId = "Choose an active team member.";
      }
    } else {
      assignedToId = actor.id;
    }

    if (Object.keys(errors).length > 0) {
      return jsonError(400, "Validation failed.", errors);
    }

    const lostReason = resolveLostReasonForLead(
      status,
      body.lostReason as string | null | undefined,
      errors,
    );
    if (Object.keys(errors).length > 0) {
      return jsonError(400, "Validation failed.", errors);
    }

    const lead = await prisma.lead.create({
      data: {
        title: title!,
        clientName: clientName!,
        email,
        phone,
        company,
        country,
        source,
        status,
        lostReason: lostReason ?? null,
        notes,
        assignedToId,
        createdById: actor.id,
      },
      include: LEAD_INCLUDE_USERS,
    });

    void logCrmAudit({
      userId: actor.id,
      action: "created",
      entityType: "lead",
      entityId: lead.id,
      summary: `Created lead "${lead.title}"`,
    });

    return NextResponse.json({ success: true, lead: mapLeadToRow(lead) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return jsonError(400, "Invalid user assignment.");
    }
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
