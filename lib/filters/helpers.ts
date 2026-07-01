import { CRM_UNASSIGNED } from "@/lib/filters/constants";

export function matchTextSearch(
  query: string,
  values: Array<string | null | undefined>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(q));
}

export function matchOwnerFilter(
  assigneeId: string | null | undefined,
  filter: string,
): boolean {
  if (!filter) return true;
  if (filter === CRM_UNASSIGNED) return assigneeId == null;
  return assigneeId === filter;
}

export function isoDateSlice(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function matchDateRange(
  iso: string | null | undefined,
  from: string,
  to: string,
): boolean {
  if (!from && !to) return true;
  const d = isoDateSlice(iso);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export function matchNumericRange(
  value: number,
  minRaw: string,
  maxRaw: string,
): boolean {
  if (minRaw.trim()) {
    const min = Number.parseInt(minRaw, 10);
    if (Number.isFinite(min) && value < min) return false;
  }
  if (maxRaw.trim()) {
    const max = Number.parseInt(maxRaw, 10);
    if (Number.isFinite(max) && value > max) return false;
  }
  return true;
}

export function distinctSorted(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) set.add(trimmed);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
