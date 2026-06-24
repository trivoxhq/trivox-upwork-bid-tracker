import { Prisma } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma";
import { ADMIN_USER_PUBLIC_SELECT } from "@/lib/users/admin-user-public-select";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requireAdminApi();
    if (!gate.ok) return gate.response;

    const { id } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    if (typeof body !== "object" || body === null || !("isActive" in body)) {
      return NextResponse.json(
        { success: false, message: "isActive is required." },
        { status: 400 },
      );
    }

    const isActive = (body as { isActive: unknown }).isActive;
    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, message: "isActive must be a boolean." },
        { status: 400 },
      );
    }

    if (!isActive && id === gate.adminId) {
      return NextResponse.json(
        { success: false, message: "You cannot deactivate your own account." },
        { status: 400 },
      );
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data: { isActive },
        select: ADMIN_USER_PUBLIC_SELECT,
      });

      return NextResponse.json({ success: true, user });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
      }
      throw e;
    }
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
