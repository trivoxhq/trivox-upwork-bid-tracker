import { jwtVerify } from "jose";

/**
 * Edge-compatible JWT verification for middleware (jsonwebtoken is Node-only).
 * Tokens must be signed with HS256 (same as login route).
 */
export async function verifyAuthTokenEdge(token: string): Promise<boolean> {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) return false;
  try {
    const key = new TextEncoder().encode(secret);
    await jwtVerify(token, key, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}
