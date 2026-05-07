import { serialize } from "cookie";
import { AUTH_COOKIE_NAME, AUTH_TOKEN_MAX_AGE_SEC } from "@/lib/auth/constants";

function secureCookieFlag(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Set serialized HttpOnly cookie header value for the auth JWT */
export function buildAuthCookieHeader(token: string): string {
  return serialize(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: secureCookieFlag(),
    sameSite: "strict",
    path: "/",
    maxAge: AUTH_TOKEN_MAX_AGE_SEC,
  });
}

/** Clear auth cookie (e.g. logout) */
export function buildClearAuthCookieHeader(): string {
  return serialize(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: secureCookieFlag(),
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
