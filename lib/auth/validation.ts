import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth/constants";

export function isAllowedEmailDomain(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(ALLOWED_EMAIL_DOMAIN.toLowerCase());
}
