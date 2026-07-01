import {
  isLostBidStatus,
  isLostDealStage,
  isLostLeadStatus,
  isValidLostReason,
} from "@/lib/lost-reasons/catalog";

export function resolveLostReasonForLead(
  status: string,
  lostReason: string | null | undefined,
  errors: Record<string, string>,
): string | null | undefined {
  if (lostReason === undefined) {
    if (isLostLeadStatus(status)) return null;
    return undefined;
  }
  if (lostReason === null || lostReason === "") {
    return isLostLeadStatus(status) ? null : null;
  }
  if (typeof lostReason !== "string") {
    errors.lostReason = "lostReason must be a string or null.";
    return undefined;
  }
  const trimmed = lostReason.trim();
  if (!trimmed) return null;
  if (!isValidLostReason(trimmed)) {
    errors.lostReason = "lostReason must be one of the configured options.";
    return undefined;
  }
  if (!isLostLeadStatus(status)) return null;
  return trimmed;
}

export function resolveLostReasonForDeal(
  stage: string,
  lostReason: string | null | undefined,
  errors: Record<string, string>,
): string | null | undefined {
  if (lostReason === undefined) {
    if (isLostDealStage(stage)) return null;
    return undefined;
  }
  if (lostReason === null || lostReason === "") {
    return isLostDealStage(stage) ? null : null;
  }
  if (typeof lostReason !== "string") {
    errors.lostReason = "lostReason must be a string or null.";
    return undefined;
  }
  const trimmed = lostReason.trim();
  if (!trimmed) return null;
  if (!isValidLostReason(trimmed)) {
    errors.lostReason = "lostReason must be one of the configured options.";
    return undefined;
  }
  if (!isLostDealStage(stage)) return null;
  return trimmed;
}

export function resolveLostReasonForBid(
  status: string,
  lostReason: string | null | undefined,
  errors: Record<string, string>,
): string | null | undefined {
  if (lostReason === undefined) {
    if (isLostBidStatus(status)) return null;
    return undefined;
  }
  if (lostReason === null || lostReason === "") {
    return isLostBidStatus(status) ? null : null;
  }
  if (typeof lostReason !== "string") {
    errors.lostReason = "lostReason must be a string or null.";
    return undefined;
  }
  const trimmed = lostReason.trim();
  if (!trimmed) return null;
  if (!isValidLostReason(trimmed)) {
    errors.lostReason = "lostReason must be one of the configured options.";
    return undefined;
  }
  if (!isLostBidStatus(status)) return null;
  return trimmed;
}
