import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { CLIENT_INCLUDE_HISTORY, mapClientToRow } from "@/lib/clients/map-client";
import { prisma } from "@/lib/prisma";

type CreateClientBody = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  company?: unknown;
  country?: unknown;
  source?: unknown;
  notes?: unknown;
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
    select: { id: true, isActive: true, role: true },
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

export async function GET() {
  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    const clients = await prisma.client.findMany({
      include: CLIENT_INCLUDE_HISTORY,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, clients: clients.map(mapClientToRow) });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActiveActor();
    if (!actor?.isActive) return jsonError(401, "Unauthorized.");

    let body: CreateClientBody;
    try {
      body = (await request.json()) as CreateClientBody;
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    const errors: Record<string, string> = {};
    const name = requiredString(body.name, "name", errors);
    const email = optionalString(body.email, "email", errors);
    const phone = optionalString(body.phone, "phone", errors);
    const company = optionalString(body.company, "company", errors);
    const country = optionalString(body.country, "country", errors);
    const source = optionalString(body.source, "source", errors);
    const notes = optionalString(body.notes, "notes", errors);

    if (Object.keys(errors).length > 0) return jsonError(400, "Validation failed.", errors);

    const client = await prisma.client.create({
      data: {
        name: name!,
        email,
        phone,
        company,
        country,
        source,
        notes,
        createdById: actor.id,
      },
      include: CLIENT_INCLUDE_HISTORY,
    });

    return NextResponse.json({ success: true, client: mapClientToRow(client) }, { status: 201 });
  } catch {
    return jsonError(500, "Something went wrong. Please try again.");
  }
}
