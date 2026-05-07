import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "1";

    if (includeInactive && actor.role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    const where = includeInactive ? {} : { isActive: true };
    const niches = await prisma.niche.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, isActive: true, createdAt: true },
    });

    return NextResponse.json({ success: true, niches });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GET /api/niches]", err);
    }
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireAdminApi();
    if (!gate.ok) return gate.response;

    let body: { name?: unknown };
    try {
      body = (await request.json()) as { name?: unknown };
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors: { name: "Name is required." } },
        { status: 400 },
      );
    }

    const niche = await prisma.niche.create({
      data: { name: body.name.trim() },
      select: { id: true, name: true, isActive: true, createdAt: true },
    });

    return NextResponse.json({ success: true, niche }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
