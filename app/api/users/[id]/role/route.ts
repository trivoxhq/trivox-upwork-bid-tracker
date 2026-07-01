import { Prisma, Role } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { ASSIGNABLE_ROLES, isValidRole } from "@/lib/auth/roles";
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

    if (typeof body !== "object" || body === null || !("role" in body)) {
      return NextResponse.json({ success: false, message: "role is required." }, { status: 400 });
    }

    const roleValue = (body as { role: unknown }).role;
    if (typeof roleValue !== "string" || !isValidRole(roleValue)) {
      return NextResponse.json(
        {
          success: false,
          message: `Role must be one of: ${ASSIGNABLE_ROLES.join(", ")}.`,
        },
        { status: 400 },
      );
    }

    const role = roleValue as Role;

    if (id === gate.adminId && role !== Role.admin) {
      return NextResponse.json(
        { success: false, message: "You cannot change your own role away from administrator." },
        { status: 400 },
      );
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data: { role },
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
