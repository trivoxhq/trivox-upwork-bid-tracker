import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { verifyAuthToken, type AuthJwtPayload } from "@/lib/auth/jwt";

/**
 * Resolve current user from the HttpOnly JWT cookie (Server Components / Route Handlers).
 */
export async function getCurrentUser(): Promise<AuthJwtPayload | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyAuthToken(token);
  } catch {
    return null;
  }
}
