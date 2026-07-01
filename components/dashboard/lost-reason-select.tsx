"use client";

import { LOST_REASON_OPTIONS } from "@/lib/lost-reasons/catalog";
import { CRM_FILTER_INPUT_CLASS } from "@/lib/filters/constants";

type LostReasonSelectProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function LostReasonSelect({
  value,
  onChange,
  disabled = false,
  className = CRM_FILTER_INPUT_CLASS,
}: LostReasonSelectProps) {
  return (
    <select
      className={className}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select reason (optional)</option>
      {LOST_REASON_OPTIONS.map((reason) => (
        <option key={reason} value={reason}>
          {reason}
        </option>
      ))}
    </select>
  );
}
