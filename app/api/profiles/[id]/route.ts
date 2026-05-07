import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireAdminApi();
    if (!gate.ok) return gate.response;

    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ success: false, message: "Profile id is required." }, { status: 400 });
    }

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

    const profile = await prisma.profile.update({
      where: { id },
      data: { name: body.name.trim() },
      select: { id: true, name: true, isActive: true, createdAt: true },
    });

    return NextResponse.json({ success: true, profile });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2025") {
      return NextResponse.json({ success: false, message: "Profile not found." }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireAdminApi();
    if (!gate.ok) return gate.response;

    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ success: false, message: "Profile id is required." }, { status: 400 });
    }

    await prisma.profile.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2025") {
      return NextResponse.json({ success: false, message: "Profile not found." }, { status: 404 });
    }
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
