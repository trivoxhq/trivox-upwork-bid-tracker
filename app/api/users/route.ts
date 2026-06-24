import { Prisma, Role } from "@/generated/prisma-client";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { hashPassword } from "@/lib/auth/password";
import { isAllowedEmailDomain } from "@/lib/auth/validation";
import { prisma } from "@/lib/prisma";
import { ADMIN_USER_PUBLIC_SELECT } from "@/lib/users/admin-user-public-select";

const MIN_PASSWORD_LEN = 8;

function resolveRole(value: unknown): { role: Role; error?: string } {
  if (value === undefined || value === null || value === "") {
    return { role: Role.member };
  }
  if (value === "admin" || value === "member") {
    return { role: value };
  }
  return { role: Role.member, error: "Role must be admin or member." };
}

export async function GET() {
  try {
    const gate = await requireAdminApi();
    if (!gate.ok) return gate.response;

    const users = await prisma.user.findMany({
      select: ADMIN_USER_PUBLIC_SELECT,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, users });
  } catch {
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

    let body: { name?: unknown; email?: unknown; password?: unknown; role?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const { role: resolvedRole, error: roleError } = resolveRole(body.role);

    const errors: Record<string, string> = {};
    if (!name) errors.name = "Name is required.";
    if (!email) errors.email = "Email is required.";
    else if (!isAllowedEmailDomain(email)) {
      errors.email = "Email must be a @trivoxhq.com address.";
    }
    if (!password) errors.password = "Password is required.";
    else if (password.length < MIN_PASSWORD_LEN) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LEN} characters.`;
    }
    if (roleError) errors.role = roleError;

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { success: false, message: "Validation failed.", errors },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "A user with this email already exists.", errors: { email: "Email is already in use." } },
        { status: 409 },
      );
    }

    try {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashPassword(password),
          role: resolvedRole,
        },
        select: ADMIN_USER_PUBLIC_SELECT,
      });

      return NextResponse.json({ success: true, user }, { status: 201 });
    } catch (createErr) {
      if (createErr instanceof Prisma.PrismaClientKnownRequestError && createErr.code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            message: "A user with this email already exists.",
            errors: { email: "Email is already in use." },
          },
          { status: 409 },
        );
      }
      throw createErr;
    }
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/users]", err);
    }
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
