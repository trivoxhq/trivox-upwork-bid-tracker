import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAuthCookieHeader } from "@/lib/auth/cookies";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth/constants";
import { OFFICE_NETWORK_FORBIDDEN_MESSAGE } from "@/lib/network/office-messages";
import {
  getClientIpFromHeaders,
  getConfiguredOfficeIps,
  isIpAllowlisted,
  isOfficeIpEnforcementEnabled,
} from "@/lib/network/office-ip";
import { signAuthToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { isAllowedEmailDomain } from "@/lib/auth/validation";

export async function POST(request: Request) {
  try {
    if (isOfficeIpEnforcementEnabled()) {
      const ip = getClientIpFromHeaders(request.headers);
      if (!isIpAllowlisted(ip, getConfiguredOfficeIps())) {
        return NextResponse.json(
          { success: false, message: OFFICE_NETWORK_FORBIDDEN_MESSAGE },
          { status: 403 },
        );
      }
    }

    let body: { email?: unknown; password?: unknown };
    try {
      body = (await request.json()) as { email?: unknown; password?: unknown };
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }
    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!emailRaw || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    if (!isAllowedEmailDomain(emailRaw)) {
      return NextResponse.json(
        {
          success: false,
          message: `Access restricted to Trivox team members. Email must end with ${ALLOWED_EMAIL_DOMAIN}.`,
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: emailRaw },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "This account is disabled." },
        { status: 403 },
      );
    }

    const passwordOk = verifyPassword(password, user.password);
    if (!passwordOk) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    response.headers.append("Set-Cookie", buildAuthCookieHeader(token));
    return response;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[POST /api/auth/login]", error);
    }
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
