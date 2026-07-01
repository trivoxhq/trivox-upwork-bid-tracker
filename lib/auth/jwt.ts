import jwt from "jsonwebtoken";
import type { Role } from "@/generated/prisma-client";
import { isValidRole } from "@/lib/auth/roles";

export type AuthJwtPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
};

const AUTH_TOKEN_EXPIRES_IN = "8h";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be set and at least 16 characters.");
  }
  return secret;
}

export function signAuthToken(payload: AuthJwtPayload): string {
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    },
    getJwtSecret(),
    {
      expiresIn: AUTH_TOKEN_EXPIRES_IN,
      algorithm: "HS256",
    },
  );
}

export function verifyAuthToken(token: string): AuthJwtPayload {
  const decoded = jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  }) as jwt.JwtPayload & Partial<AuthJwtPayload>;

  if (
    typeof decoded.sub !== "string" ||
    typeof decoded.email !== "string" ||
    typeof decoded.name !== "string" ||
    typeof decoded.role !== "string" ||
    !isValidRole(decoded.role)
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    sub: decoded.sub,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role as Role,
  };
}
