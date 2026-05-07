"use client";

import { useSearchParams } from "next/navigation";
import { OFFICE_NETWORK_FORBIDDEN_MESSAGE } from "@/lib/network/office-messages";

export function LoginOfficeNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("blocked") !== "office_network") return null;

  return (
    <div
      role="alert"
      className="mb-5 rounded-lg border border-danger/35 bg-danger/8 px-4 py-3 text-sm leading-relaxed text-danger"
    >
      {OFFICE_NETWORK_FORBIDDEN_MESSAGE} Connect from the approved office network or VPN, then try
      again.
    </div>
  );
}
