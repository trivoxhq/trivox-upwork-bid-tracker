export function parseNonNegativeBidInt(
  value: unknown,
  field: string,
  errors: Record<string, string>,
  defaultValue = 0,
): number | null {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    errors[field] = `${field} must be a whole number.`;
    return null;
  }
  if (n < 0) {
    errors[field] = `${field} cannot be negative.`;
    return null;
  }
  return n;
}
