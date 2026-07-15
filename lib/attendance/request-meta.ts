export type RequestClientMeta = {
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string | null;
};

function firstForwardedIp(header: string | null): string | null {
  if (!header?.trim()) return null;
  const first = header.split(",")[0]?.trim();
  return first || null;
}

export function extractClientMeta(request: Request, deviceFingerprint?: unknown): RequestClientMeta {
  const forwarded =
    firstForwardedIp(request.headers.get("x-forwarded-for")) ??
    firstForwardedIp(request.headers.get("x-real-ip"));
  const ipAddress = (forwarded ?? "127.0.0.1").slice(0, 191);

  const userAgent = (request.headers.get("user-agent") ?? "").trim().slice(0, 2000);

  let device: string | null = null;
  if (typeof deviceFingerprint === "string" && deviceFingerprint.trim()) {
    device = deviceFingerprint.trim().slice(0, 191);
  }

  return { ipAddress, userAgent, deviceFingerprint: device };
}

export function assertClientMeta(meta: RequestClientMeta): string | null {
  if (!meta.ipAddress.trim()) {
    return "Client IP is required for attendance actions.";
  }
  if (!meta.userAgent.trim()) {
    return "Device / user-agent is required for attendance actions.";
  }
  return null;
}
