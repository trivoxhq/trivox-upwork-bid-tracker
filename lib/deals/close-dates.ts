export function dealCloseDatePatch(
  existing: { stage: string; closedWonAt: Date | null; closedLostAt: Date | null },
  newStage: string | undefined,
): { closedWonAt?: Date | null; closedLostAt?: Date | null } {
  if (newStage === undefined) return {};

  const now = new Date();
  if (newStage === "Closed Won") {
    return {
      closedWonAt: existing.closedWonAt ?? now,
      closedLostAt: null,
    };
  }
  if (newStage === "Closed Lost") {
    return {
      closedLostAt: existing.closedLostAt ?? now,
      closedWonAt: null,
    };
  }
  return { closedWonAt: null, closedLostAt: null };
}
