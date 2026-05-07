import { NextResponse } from "next/server";
import { buildClearAuthCookieHeader } from "@/lib/auth/cookies";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", buildClearAuthCookieHeader());
  return response;
}
