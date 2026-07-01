export type ImportRowError = {
  row: number;
  message: string;
};

export type ImportResult = {
  created: number;
  failed: number;
  errors: ImportRowError[];
};

export const MAX_IMPORT_ROWS = 500;

export function normalizeHeaderKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    const key = normalizeHeaderKey(header);
    if (key) record[key] = row[index] ?? "";
  });
  return record;
}

export function pickField(record: Record<string, string>, ...aliases: string[]): string {
  for (const alias of aliases) {
    const value = record[normalizeHeaderKey(alias)];
    if (value !== undefined && value.trim() !== "") return value.trim();
  }
  return "";
}

export function parseOptionalDate(value: string, field: string, errors: string[]): Date | null {
  if (!value.trim()) return null;
  const d = new Date(value.trim());
  if (Number.isNaN(d.getTime())) {
    errors.push(`${field} must be a valid date.`);
    return null;
  }
  return d;
}

export function parseRequiredDate(value: string, field: string, errors: string[]): Date | null {
  if (!value.trim()) {
    errors.push(`${field} is required.`);
    return null;
  }
  return parseOptionalDate(value, field, errors);
}

export function parseOptionalInt(value: string, field: string, errors: string[]): number | null {
  if (!value.trim()) return null;
  const n = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    errors.push(`${field} must be a whole number.`);
    return null;
  }
  return n;
}

export function parseIntWithDefault(value: string, defaultValue: number, field: string, errors: string[]): number {
  if (!value.trim()) return defaultValue;
  const n = parseOptionalInt(value, field, errors);
  return n ?? defaultValue;
}

export type UserLookup = { id: string; name: string; email: string };

export function resolveUserRef(ref: string, users: UserLookup[]): string | null {
  const needle = ref.trim().toLowerCase();
  if (!needle) return null;

  const byEmail = users.find((u) => u.email.toLowerCase() === needle);
  if (byEmail) return byEmail.id;

  const byName = users.filter((u) => u.name.toLowerCase() === needle);
  if (byName.length === 1) return byName[0].id;

  return null;
}
