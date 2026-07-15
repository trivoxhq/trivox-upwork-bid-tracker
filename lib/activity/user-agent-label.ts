/** Short, human-readable browser/OS label from a User-Agent string. */
export function userAgentLabel(ua: string | null | undefined): string | null {
  if (!ua?.trim()) return null;
  const s = ua.trim();

  let browser = "Browser";
  if (/Edg\//i.test(s)) browser = "Edge";
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = "Chrome";
  else if (/Firefox\//i.test(s)) browser = "Firefox";
  else if (/Safari\//i.test(s) && !/Chrome/i.test(s)) browser = "Safari";
  else if (/OPR\//i.test(s) || /Opera/i.test(s)) browser = "Opera";

  let os = "Unknown OS";
  if (/Windows NT/i.test(s)) os = "Windows";
  else if (/Android/i.test(s)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(s)) os = "iOS";
  else if (/Mac OS X/i.test(s)) os = "macOS";
  else if (/Linux/i.test(s)) os = "Linux";

  return `${browser} · ${os}`;
}

export function shortDeviceId(deviceId: string | null | undefined): string | null {
  if (!deviceId?.trim()) return null;
  const id = deviceId.trim();
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function formatIpLabel(ip: string | null | undefined): string | null {
  if (!ip?.trim()) return null;
  const v = ip.trim();
  if (v === "::1" || v === "127.0.0.1") return "Localhost";
  return v;
}
