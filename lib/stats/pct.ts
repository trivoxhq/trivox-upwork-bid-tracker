export function pctNumeratorOverTotal(numerator: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((numerator / total) * 1000) / 10;
}
