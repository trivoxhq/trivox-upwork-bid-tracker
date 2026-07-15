const STORAGE_KEY = "upwork-bid-tracker-device-id";

export function getOrCreateDeviceFingerprint(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing?.trim()) return existing.trim().slice(0, 191);
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return `ephemeral-${Date.now()}`;
  }
}
