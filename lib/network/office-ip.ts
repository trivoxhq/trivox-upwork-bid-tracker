/**
 * Office-only access (Section 5.3). When `ALLOWED_OFFICE_IPS` is unset or empty,
 * enforcement is skipped so local dev works without extra config.
 */

import type { NextRequest } from "next/server";

function normalizeIp(ip: string): string {
  const t = ip.trim();
  if (t.startsWith("::ffff:")) return t.slice(7);
  return t;
}

export function getConfiguredOfficeIps(): string[] {
  const raw = process.env.ALLOWED_OFFICE_IPS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => normalizeIp(s))
    .filter(Boolean);
}

export function isOfficeIpEnforcementEnabled(): boolean {
  return getConfiguredOfficeIps().length > 0;
}

/** For Route Handlers that only have `globalThis.Request`. */
export function getClientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }
  const real = headers.get("x-real-ip");
  if (real?.trim()) return normalizeIp(real);
  return "";
}

export function getClientIp(request: NextRequest): string {
  const fromHeaders = getClientIpFromHeaders(request.headers);
  if (fromHeaders) return fromHeaders;

  const geo = (request as NextRequest & { geo?: { ip?: string } }).geo;
  if (geo?.ip) return normalizeIp(geo.ip);

  return "";
}

/** Simple exact match; trims and compares case-sensitively. */
export function isIpAllowlisted(clientIp: string, allowed: string[]): boolean {
  if (!clientIp) return false;
  const n = normalizeIp(clientIp);
  return allowed.some((a) => normalizeIp(a) === n);
}
