import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const MIN_PASSWORD_LEN = 8;

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!id?.trim()) {
      return NextResponse.json({ success: false, message: "User id is required." }, { status: 400 });
    }

    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, role: true, isActive: true },
    });

    if (!actor?.isActive) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const isSelf = actor.id === id;
    if (actor.role !== "admin" && !isSelf) {
      return NextResponse.json({ success: false, message: "Forbidden." }, { status: 403 });
    }

    let body: { password?: unknown };
    try {
      body = (await request.json()) as { password?: unknown };
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < MIN_PASSWORD_LEN) {
      return NextResponse.json(
        {
          success: false,
          message: `Password must be at least ${MIN_PASSWORD_LEN} characters.`,
        },
        { status: 400 },
      );
    }

    const exists = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    await prisma.user.update({
      where: { id },
      data: { password: hashPassword(password) },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
