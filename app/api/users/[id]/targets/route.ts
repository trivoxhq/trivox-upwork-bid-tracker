import { Prisma } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma";
import { ADMIN_USER_PUBLIC_SELECT } from "@/lib/users/admin-user-public-select";

function parseNonNegativeInt(value: unknown, field: string, errors: Record<string, string>): number | null {
  if (value === undefined || value === null) {
    errors[field] = `${field} is required.`;
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors[field] = `${field} must be a number.`;
    return null;
  }
  if (!Number.isInteger(value)) {
    errors[field] = `${field} must be a whole number.`;
    return null;
  }
  if (value < 0) {
    errors[field] = `${field} cannot be negative.`;
    return null;
  }
  return value;
}

export async function PUT(
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

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ success: false, message: "Invalid body." }, { status: 400 });
    }

    const record = body as Record<string, unknown>;
    const errors: Record<string, string> = {};
    const dailyTarget = parseNonNegativeInt(record.dailyTarget, "dailyTarget", errors);
    const weeklyTarget = parseNonNegativeInt(record.weeklyTarget, "weeklyTarget", errors);
    const monthlyTarget = parseNonNegativeInt(record.monthlyTarget, "monthlyTarget", errors);
    const monthlySalary = parseNonNegativeInt(record.monthlySalary, "monthlySalary", errors);

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors },
        { status: 400 },
      );
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          dailyTarget: dailyTarget!,
          weeklyTarget: weeklyTarget!,
          monthlyTarget: monthlyTarget!,
          monthlySalary: monthlySalary!,
        },
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
