import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { verifyAuthTokenEdge } from "@/lib/auth/middleware-verify";
import { OFFICE_NETWORK_FORBIDDEN_MESSAGE } from "@/lib/network/office-messages";
import {
  getClientIp,
  getConfiguredOfficeIps,
  isIpAllowlisted,
  isOfficeIpEnforcementEnabled,
} from "@/lib/network/office-ip";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authed = Boolean(token && (await verifyAuthTokenEdge(token)));

  const enforcing = isOfficeIpEnforcementEnabled();
  const allowed = getConfiguredOfficeIps();
  const ip = getClientIp(request);
  const officeOk = !enforcing || isIpAllowlisted(ip, allowed);

  if (!officeOk && pathname.startsWith("/api")) {
    return NextResponse.json(
      { success: false, message: OFFICE_NETWORK_FORBIDDEN_MESSAGE },
      { status: 403 },
    );
  }

  if (!officeOk && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("blocked", "office_network");
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/dashboard")) {
    if (!authed) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/login")) {
    if (authed && officeOk) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/api/:path*"],
};
