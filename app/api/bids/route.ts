import { NextResponse } from "next/server";
import { listBidsForActor } from "@/lib/bids/list-bids-for-actor";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { getCurrentUser } from "@/lib/auth/session";
import { readOnlyForbiddenResponse } from "@/lib/auth/api-guards";
import { canWrite } from "@/lib/auth/roles";
import { parseNonNegativeBidInt } from "@/lib/bids/parse-bid-integers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, isActive: true, role: true },
    });

    if (!actor?.isActive) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const bids = await listBidsForActor(actor);

    return NextResponse.json({ success: true, bids });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

type CreateBidBody = {
  date?: unknown;
  profileId?: unknown;
  nicheId?: unknown;
  client?: unknown;
  bidLink?: unknown;
  value?: unknown;
  connects?: unknown;
  boost?: unknown;
  notes?: unknown;
};

function requiredNonEmptyString(value: unknown, field: string, errors: Record<string, string>) {
  if (typeof value !== "string" || !value.trim()) {
    errors[field] = `${field} is required.`;
    return null;
  }
  return value.trim();
}

function optionalNullableString(
  value: unknown,
  field: string,
  errors: Record<string, string>,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    errors[field] = `${field} must be a string.`;
    return null;
  }
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function parseBidDate(value: unknown, errors: Record<string, string>): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    errors.date = "date is required.";
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    errors.date = "date must be a valid date or ISO-8601 string.";
    return null;
  }
  return d;
}

function parseBidValue(value: unknown, errors: Record<string, string>): number | null {
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.value = "value must be a number.";
    return null;
  }
  if (!Number.isInteger(value)) {
    errors.value = "value must be an integer.";
    return null;
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    let body: CreateBidBody;
    try {
      body = (await request.json()) as CreateBidBody;
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    const errors: Record<string, string> = {};

    const date = parseBidDate(body.date, errors);
    const profileId = requiredNonEmptyString(body.profileId, "profileId", errors);
    const nicheId = requiredNonEmptyString(body.nicheId, "nicheId", errors);
    const client = requiredNonEmptyString(body.client, "client", errors);
    const value = parseBidValue(body.value, errors);
    const connects = parseNonNegativeBidInt(body.connects, "connects", errors);
    const boost = parseNonNegativeBidInt(body.boost, "boost", errors);

    const bidLink = optionalNullableString(body.bidLink, "bidLink", errors);
    const notes = optionalNullableString(body.notes, "notes", errors);

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors },
        { status: 400 },
      );
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, isActive: true, role: true },
    });

    if (!actor?.isActive) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }
    if (!canWrite(actor.role)) {
      return readOnlyForbiddenResponse();
    }

    const [profile, niche] = await Promise.all([
      prisma.profile.findFirst({
        where: { id: profileId!, isActive: true },
        select: { id: true },
      }),
      prisma.niche.findFirst({
        where: { id: nicheId!, isActive: true },
        select: { id: true },
      }),
    ]);

    if (!profile) {
      errors.profileId = "Unknown or inactive profile.";
    }
    if (!niche) {
      errors.nicheId = "Unknown or inactive niche.";
    }
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors },
        { status: 400 },
      );
    }

    const bid = await prisma.bid.create({
      data: {
        date: date!,
        profileId: profileId!,
        nicheId: nicheId!,
        client: client!,
        bidLink,
        notes,
        value: value!,
        connects: connects!,
        boost: boost!,
        addedById: actor.id,
      },
      include: {
        profile: { select: { id: true, name: true, isActive: true } },
        niche: { select: { id: true, name: true, isActive: true } },
        addedBy: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, bid }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const gate = await requireAdminApi();
    if (!gate.ok) return gate.response;

    const requiredPin = process.env.ADMIN_DESTRUCTIVE_PIN?.trim();
    if (requiredPin) {
      let bodyPin: string | undefined;
      try {
        const body = (await request.json()) as { pin?: unknown };
        bodyPin = typeof body.pin === "string" ? body.pin : undefined;
      } catch {
        bodyPin = undefined;
      }
      if (bodyPin !== requiredPin) {
        return NextResponse.json(
          { success: false, message: "Invalid or missing confirmation PIN." },
          { status: 403 },
        );
      }
    }

    const result = await prisma.bid.deleteMany({});
    return NextResponse.json({ success: true, deleted: result.count });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
